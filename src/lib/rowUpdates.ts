import { quoteIdent, sqlLiteral } from './gridFilters'

export interface RowUpdateBatch {
  updates: { column: string; value: unknown }[]
  pks: { column: string; value: unknown }[]
}

export function buildUpdateSql(table: string, batch: RowUpdateBatch[]): string {
  const tableIdent = table.split('.').map(quoteIdent).join('.')
  return batch.map((row) => {
    if (!row.pks.length) {
      throw new Error(`Cannot generate UPDATE statement for ${table}: missing key predicate`)
    }
    const set = row.updates.map(u => `${quoteIdent(u.column)} = ${sqlLiteral(u.value)}`).join(', ')
    const where = row.pks.map(p => `${quoteIdent(p.column)} = ${sqlLiteral(p.value)}`).join(' AND ')
    return `UPDATE ${tableIdent} SET ${set} WHERE ${where} LIMIT 1;`
  }).join('\n')
}
