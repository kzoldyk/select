import type { EditorView } from '@codemirror/view'
import { startCompletion } from '@codemirror/autocomplete'
import { analyzeSqlScope, type InScopeTable } from './sqlScope'

export interface CompletionOption {
  label: string
  type: string
  detail?: string
  boost?: number
  apply?: string | ((view: EditorView, completion: any, from: number, to: number) => void)
}

export const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN',
  'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'SHOW', 'DESCRIBE', 'EXPLAIN', 'WITH',
  'AS', 'ON', 'AND', 'OR', 'NOT', 'IN', 'IS NULL', 'IS NOT NULL', 'LIKE', 'BETWEEN',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
  'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES',
  'CASCADE', 'UNIQUE', 'CHECK', 'DEFAULT', 'NULL', 'NOT NULL', 'AUTO_INCREMENT'
]

export const SQL_FUNCTIONS = [
  { label: 'COUNT()', apply: 'COUNT(*)', detail: 'function · count rows' },
  { label: 'SUM()', apply: 'SUM()', detail: 'function · sum values' },
  { label: 'AVG()', apply: 'AVG()', detail: 'function · average' },
  { label: 'MIN()', apply: 'MIN()', detail: 'function · minimum' },
  { label: 'MAX()', apply: 'MAX()', detail: 'function · maximum' },
  { label: 'COALESCE()', apply: 'COALESCE()', detail: 'function · first non-null' },
  { label: 'DISTINCT', apply: 'DISTINCT ', detail: 'keyword · unique rows' },
  { label: 'NOW()', apply: 'NOW()', detail: 'function · current timestamp' },
  { label: 'DATE()', apply: 'DATE()', detail: 'function · extract date' },
  { label: 'DATE_FORMAT()', apply: 'DATE_FORMAT()', detail: 'function · format date' },
  { label: 'CONCAT()', apply: 'CONCAT()', detail: 'function · concatenate strings' },
  { label: 'LOWER()', apply: 'LOWER()', detail: 'function · lowercase' },
  { label: 'UPPER()', apply: 'UPPER()', detail: 'function · uppercase' },
  { label: 'TRIM()', apply: 'TRIM()', detail: 'function · trim whitespace' },
  { label: 'ROUND()', apply: 'ROUND()', detail: 'function · round number' },
]

export async function getSqlCompletionOptions(
  doc: string,
  pos: number,
  wordText: string,
  schemaStore: any
): Promise<CompletionOption[]> {
  const q = wordText.toLowerCase()
  const ctx = analyzeSqlScope(doc, pos)
  const options: CompletionOption[] = []

  // Ensure databases list is populated if available
  if ((!schemaStore.databases || schemaStore.databases.length === 0) && schemaStore.fetchDatabases) {
    await schemaStore.fetchDatabases().catch(() => null)
  }

  // 1. Dot Trigger (Schema.Tables, Table.Columns, Alias.Columns)
  if (ctx.isAfterDot) {
    const lowerPrefix = ctx.dotPrefix.toLowerCase()

    // A. Check if dotPrefix is a Database / Schema name (or fetch tables for schema)
    const isDatabase = schemaStore.databases?.some((d: string) => d.toLowerCase() === lowerPrefix)
    if (isDatabase || schemaStore.fetchTablesForSchema) {
      if (isDatabase) {
        const tables = await schemaStore.fetchTablesForSchema(ctx.dotPrefix).catch(() => [])
        if (tables.length > 0) {
          return tables
            .filter((t: string) => t.toLowerCase().startsWith(q))
            .map((t: string) => ({
              label: t,
              type: 'type',
              detail: `table · ${ctx.dotPrefix}`,
              boost: 100,
            }))
        }
      }
    }

    // B. Check if dotPrefix is an Alias in current scope (e.g. `u.` -> `users`)
    const matchedAlias = ctx.inScopeTables.find(t => (t.alias || '').toLowerCase() === lowerPrefix)
    const targetTable = matchedAlias?.table || lowerPrefix
    const targetSchema = matchedAlias?.schema

    // Retrieve column details for resolved table (fetch on-demand if uncached)
    const qualifiedTarget = targetSchema ? `${targetSchema}.${targetTable}` : targetTable
    let details = schemaStore.detailsByTable?.[qualifiedTarget.toLowerCase()] || 
                  schemaStore.detailsByTable?.[targetTable.toLowerCase()]

    if (!details && schemaStore.fetchTableDetails) {
      details = await schemaStore.fetchTableDetails(qualifiedTarget).catch(() => null)
    }

    if (details?.columns && details.columns.length > 0) {
      const aliasLabel = matchedAlias?.alias ? ` (${matchedAlias.alias})` : ''
      return details.columns
        .filter((c: any) => c.name.toLowerCase().startsWith(q))
        .map((c: any) => ({
          label: c.name,
          type: c.pk ? 'keyword' : 'property',
          detail: `${c.columnType || c.type} · ${targetTable}${aliasLabel}`,
          boost: 100,
        }))
    }

    // C. Check if dotPrefix is a Schema that wasn't in schemaStore.databases
    if (schemaStore.fetchTablesForSchema) {
      const schemaTables = await schemaStore.fetchTablesForSchema(ctx.dotPrefix).catch(() => [])
      if (schemaTables.length > 0) {
        return schemaTables
          .filter((t: string) => t.toLowerCase().startsWith(q))
          .map((t: string) => ({
            label: t,
            type: 'type',
            detail: `table · ${ctx.dotPrefix}`,
            boost: 100,
          }))
      }
    }

    // Fallback: search all cached columns matching prefix
    const allCols: { name: string; table: string; type: string }[] = []
    for (const [tbl, dt] of Object.entries(schemaStore.detailsByTable || {})) {
      for (const col of (dt as any).columns || []) {
        if (tbl.toLowerCase() === lowerPrefix || tbl.toLowerCase().endsWith(`.${lowerPrefix}`)) {
          allCols.push({ name: col.name, table: tbl, type: col.columnType })
        }
      }
    }
    if (allCols.length > 0) {
      return allCols
        .filter(c => c.name.toLowerCase().startsWith(q))
        .map(c => ({
          label: c.name,
          type: 'property',
          detail: `${c.type} · ${c.table}`,
          boost: 90,
        }))
    }

    return []
  }

  // 2. JOIN ... ON Trigger (Propose Foreign Key Join Conditions & column equality)
  if (ctx.isAfterOn && ctx.currentJoinTable) {
    const joinTbl = ctx.currentJoinTable
    const priorTables = ctx.inScopeTables.filter(t => 
      t.table.toLowerCase() !== joinTbl.table.toLowerCase() || 
      (t.alias && joinTbl.alias && t.alias.toLowerCase() !== joinTbl.alias.toLowerCase())
    )

    // Preload FKs for the joined table
    let fks = schemaStore.foreignKeysByTable?.[joinTbl.table] || []
    if (fks.length === 0 && schemaStore.fetchForeignKeys) {
      fks = await schemaStore.fetchForeignKeys(joinTbl.table).catch(() => [])
    }

    // A. Match FKs
    for (const fk of fks) {
      const srcTbl = fk.table_name || fk.tableName || joinTbl.table
      const srcCol = fk.column_name || fk.columnName
      const tgtTbl = fk.referenced_table || fk.referencedTable
      const tgtCol = fk.referenced_column || fk.referencedColumn

      for (const prior of priorTables) {
        if (srcTbl.toLowerCase() === joinTbl.table.toLowerCase() && tgtTbl.toLowerCase() === prior.table.toLowerCase()) {
          const leftIdent = joinTbl.alias || joinTbl.table
          const rightIdent = prior.alias || prior.table
          const condition = `${leftIdent}.${srcCol} = ${rightIdent}.${tgtCol}`
          options.push({
            label: condition,
            type: 'keyword',
            detail: `FK · ${joinTbl.table} ➔ ${prior.table}`,
            boost: 100,
          })
        }
        if (tgtTbl.toLowerCase() === joinTbl.table.toLowerCase() && srcTbl.toLowerCase() === prior.table.toLowerCase()) {
          const leftIdent = joinTbl.alias || joinTbl.table
          const rightIdent = prior.alias || prior.table
          const condition = `${leftIdent}.${tgtCol} = ${rightIdent}.${srcCol}`
          options.push({
            label: condition,
            type: 'keyword',
            detail: `FK · ${prior.table} ➔ ${joinTbl.table}`,
            boost: 100,
          })
        }
      }
    }

    // B. Propose same-named column equality if no FK match found
    let joinDetails = schemaStore.detailsByTable?.[joinTbl.table.toLowerCase()]
    if (!joinDetails && schemaStore.fetchTableDetails) {
      joinDetails = await schemaStore.fetchTableDetails(joinTbl.table).catch(() => null)
    }

    if (joinDetails?.columns) {
      for (const prior of priorTables) {
        let priorDetails = schemaStore.detailsByTable?.[prior.table.toLowerCase()]
        if (!priorDetails && schemaStore.fetchTableDetails) {
          priorDetails = await schemaStore.fetchTableDetails(prior.table).catch(() => null)
        }
        if (priorDetails?.columns) {
          for (const jCol of joinDetails.columns) {
            const match = priorDetails.columns.find((pCol: any) => pCol.name.toLowerCase() === jCol.name.toLowerCase())
            if (match) {
              const leftIdent = joinTbl.alias || joinTbl.table
              const rightIdent = prior.alias || prior.table
              const cond = `${leftIdent}.${jCol.name} = ${rightIdent}.${match.name}`
              if (!options.some(o => o.label === cond)) {
                options.push({
                  label: cond,
                  type: 'keyword',
                  detail: `Same column · ${jCol.name}`,
                  boost: 85,
                })
              }
            }
          }
        }
      }
    }
  }

  // 3. FROM / JOIN Clause (Prioritize Schemas, Tables, Views with alias generation)
  if (ctx.clause === 'FROM' || ctx.clause === 'JOIN' || ctx.clause === 'INSERT_INTO') {
    // Schemas
    if (schemaStore.databases) {
      for (const d of schemaStore.databases) {
        if (d.toLowerCase().startsWith(q)) {
          options.push({
            label: d,
            type: 'namespace',
            detail: 'schema',
            boost: 85,
            apply: (view: EditorView, completion: any, from: number, to: number) => {
              view.dispatch({ changes: { from, to, insert: `${d}.` } })
              setTimeout(() => startCompletion(view), 10)
            }
          })
        }
      }
    }

    // Tables & Views
    const allTables = [...(schemaStore.tables || []), ...(schemaStore.views || [])]
    for (const t of allTables) {
      if (t.name.toLowerCase().startsWith(q)) {
        options.push({
          label: t.name,
          type: t.type === 'view' ? 'interface' : 'type',
          detail: t.type || 'table',
          boost: 95,
        })
        const autoAlias = generateAutoAlias(t.name)
        if (autoAlias && autoAlias.length > 0 && autoAlias !== t.name) {
          options.push({
            label: `${t.name} ${autoAlias}`,
            type: 'type',
            detail: `table with alias "${autoAlias}"`,
            boost: 92,
          })
        }
      }
    }

    return options.sort((a, b) => (b.boost ?? 0) - (a.boost ?? 0))
  }

  // 4. In-Scope Column Suggestions for SELECT, WHERE, ORDER BY, GROUP BY, SET
  if (ctx.inScopeTables.length > 0) {
    for (const tbl of ctx.inScopeTables) {
      const qualified = tbl.schema ? `${tbl.schema}.${tbl.table}` : tbl.table
      let dt = schemaStore.detailsByTable?.[qualified.toLowerCase()] || 
               schemaStore.detailsByTable?.[tbl.table.toLowerCase()]
      
      // On-demand fetch if table details are not yet cached
      if (!dt && schemaStore.fetchTableDetails) {
        dt = await schemaStore.fetchTableDetails(qualified).catch(() => null)
      }
      
      if (dt?.columns) {
        const aliasLabel = tbl.alias ? ` (${tbl.alias})` : ''
        for (const col of dt.columns) {
          if (col.name.toLowerCase().startsWith(q)) {
            options.push({
              label: col.name,
              type: col.pk ? 'keyword' : 'property',
              detail: `${col.columnType || col.type} · ${tbl.table}${aliasLabel}`,
              boost: 100, // Top priority for in-scope columns
            })
            // If alias is defined and multiple tables are in scope, also offer prefixed alias
            if (tbl.alias && ctx.inScopeTables.length > 1) {
              const prefixed = `${tbl.alias}.${col.name}`
              if (prefixed.toLowerCase().startsWith(q)) {
                options.push({
                  label: prefixed,
                  type: 'property',
                  detail: `${col.columnType || col.type} · ${tbl.table}`,
                  boost: 95,
                })
              }
            }
          }
        }
      }
    }
  }

  // 5. Functions
  for (const fn of SQL_FUNCTIONS) {
    if (fn.label.toLowerCase().startsWith(q)) {
      options.push({
        label: fn.label,
        type: 'function',
        detail: fn.detail,
        boost: 60,
      })
    }
  }

  // 6. Keywords
  for (const k of SQL_KEYWORDS) {
    if (k.toLowerCase().startsWith(q)) {
      options.push({
        label: k,
        type: 'keyword',
        detail: 'SQL keyword',
        boost: 50,
        apply: `${k} `,
      })
    }
  }

  // 7. Global Tables fallback
  const allTables = [...(schemaStore.tables || []), ...(schemaStore.views || [])]
  for (const t of allTables) {
    if (t.name.toLowerCase().startsWith(q) && !options.some(o => o.label === t.name)) {
      options.push({
        label: t.name,
        type: 'type',
        detail: 'table',
        boost: 40,
      })
    }
  }

  // Sort by boost descending
  return options.sort((a, b) => (b.boost ?? 0) - (a.boost ?? 0))
}

/**
 * Generates an intuitive acronym/alias for a table name (e.g. order_items -> oi, users -> u).
 */
export function generateAutoAlias(tableName: string): string {
  const clean = tableName.replace(/[`"\[\]']/g, '')
  if (clean.includes('_')) {
    return clean.split('_').map(w => w[0]?.toLowerCase()).join('')
  }
  return clean[0]?.toLowerCase() || ''
}
