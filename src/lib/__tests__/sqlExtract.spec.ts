import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import {
  isNotebookDocument,
  detectDocumentFormat,
  hasSqlQueries,
  findSqlFences,
  getSqlFenceAtPos,
  extractRunnableSql,
  isInSqlContext,
  convertSqlToNotebook,
  convertNotebookContentToSql,
} from '../sqlExtract'

describe('detectDocumentFormat', () => {
  it('returns sql for plain SQL queries', () => {
    expect(detectDocumentFormat('SELECT * FROM users;')).toBe('sql')
    expect(detectDocumentFormat('INSERT INTO users (name) VALUES ("Alice");')).toBe('sql')
  })

  it('returns sql for empty string or whitespace', () => {
    expect(detectDocumentFormat('')).toBe('sql')
    expect(detectDocumentFormat('   \n\t  ')).toBe('sql')
  })

  it('returns sql for MySQL scripts with # comments (prevents gray SQL)', () => {
    expect(detectDocumentFormat('# Dump of table users\nSELECT * FROM users;')).toBe('sql')
    expect(detectDocumentFormat('# Step 1\nSELECT 1;\n# Step 2\nSELECT 2;')).toBe('sql')
    expect(detectDocumentFormat('## Secondary Header\nSELECT * FROM users;')).toBe('sql')
    
    // Multi-line query with LEFT JOIN, WHERE clauses and trailing # comment (matches user screenshot)
    const multiLineSql = `SELECT
  u.id,
  u.name,
  w.name
FROM users u
LEFT JOIN warehouses w ON w.id = u.warehouse_id
WHERE u.active = 1
ORDER BY u.id DESC
LIMIT 10;
#`
    expect(detectDocumentFormat(multiLineSql)).toBe('sql')
  })

  it('returns notebook for markdown headers with notes/prose without SQL queries', () => {
    expect(detectDocumentFormat('# Project Notes\nReviewing database performance')).toBe('notebook')
    expect(detectDocumentFormat('## Performance Review\nChecked table sizes and vacuum state')).toBe('notebook')
  })

  it('returns notebook for mixed documents with SQL queries and markdown bullets, dividers, or tasks', () => {
    // Exact user screenshot case: queries + divider + heading + bullet list
    const userDoc = `SELECT ot.order_id, ot.bar_code FROM warehouses.orderticket ot WHERE ot.order_id = 26718414;
select * from courier.return_order_tracking_details order by id desc limit 100;

---

# nothing

- hi there`
    expect(detectDocumentFormat(userDoc)).toBe('notebook')

    // SQL with bullet list
    expect(detectDocumentFormat('SELECT 1;\n- Follow up with team')).toBe('notebook')

    // SQL with divider
    expect(detectDocumentFormat('SELECT 1;\n---\nSELECT 2;')).toBe('notebook')
  })

  it('returns notebook for task list checkboxes', () => {
    expect(detectDocumentFormat('- [ ] Check database indexes')).toBe('notebook')
    expect(detectDocumentFormat('- [x] Done migration')).toBe('notebook')
    expect(detectDocumentFormat('SELECT * FROM users;\n- [ ] Run backup')).toBe('notebook')
  })

  it('returns notebook for fenced code blocks', () => {
    expect(detectDocumentFormat('```sql\nSELECT 1;\n```')).toBe('notebook')
    expect(detectDocumentFormat('# Title\n\n```sql\nSELECT * FROM users;\n```')).toBe('notebook')
  })
})

describe('isNotebookDocument', () => {
  it('returns false for plain SQL', () => {
    expect(isNotebookDocument('SELECT * FROM users;')).toBe(false)
  })

  it('returns false for empty doc', () => {
    expect(isNotebookDocument('')).toBe(false)
  })

  it('does not detect headings alone (avoids MySQL # comments)', () => {
    expect(isNotebookDocument('# Analysis\nSELECT 1')).toBe(false)
    expect(isNotebookDocument('SELECT 1\n# mysql comment')).toBe(false)
  })

  it('does not detect task lists without fences', () => {
    expect(isNotebookDocument('- [ ] todo item')).toBe(false)
  })

  it('detects intentional notebook (prose + fenced sql)', () => {
    expect(isNotebookDocument('# Analysis\n\n```sql\nSELECT 1\n```')).toBe(true)
    expect(isNotebookDocument('- [ ] todo\n\n```sql\nSELECT 1\n```')).toBe(true)
  })

  it('does not detect fences alone', () => {
    expect(isNotebookDocument('```sql\nSELECT 1\n```')).toBe(false)
  })
})

describe('findSqlFences', () => {
  it('parses a single sql fence', () => {
    const doc = '# Title\n\n```sql\nSELECT 1;\n```\n'
    const blocks = findSqlFences(doc)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].sql).toBe('SELECT 1;')
  })

  it('parses multiple fences', () => {
    const doc = '```sql\nSELECT 1;\n```\n\n```sql\nSELECT 2;\n```'
    expect(findSqlFences(doc)).toHaveLength(2)
  })
})

describe('getSqlFenceAtPos', () => {
  const doc = '# Notes\n```sql\nSELECT * FROM users;\n```'

  it('returns block when cursor inside fence content', () => {
    const pos = doc.indexOf('users')
    const block = getSqlFenceAtPos(doc, pos)
    expect(block?.sql).toContain('users')
  })

  it('returns null when cursor in prose', () => {
    const pos = doc.indexOf('Notes')
    expect(getSqlFenceAtPos(doc, pos)).toBeNull()
  })
})

describe('extractRunnableSql', () => {
  function stateOf(doc: string, pos?: number) {
    return EditorState.create({
      doc,
      selection: pos !== undefined ? { anchor: pos, head: pos } : undefined,
    })
  }

  it('runs statement at cursor in sql mode', () => {
    const doc = 'SELECT 1;\nSELECT 2;'
    const pos = doc.indexOf('SELECT 2')
    const sql = extractRunnableSql(stateOf(doc, pos), 'sql')
    expect(sql).toContain('SELECT 2')
  })

  it('runs full doc in sql mode when single statement', () => {
    const doc = 'SELECT * FROM users'
    const sql = extractRunnableSql(stateOf(doc, 0), 'sql')
    expect(sql).toBe('SELECT * FROM users')
  })

  it('runs fence content in notebook mode', () => {
    const doc = '# Check\n```sql\nSELECT 1;\n```'
    const pos = doc.indexOf('SELECT 1')
    const sql = extractRunnableSql(stateOf(doc, pos), 'notebook')
    expect(sql).toContain('SELECT 1')
  })

  it('returns null in notebook mode when cursor in prose', () => {
    const doc = '# Just notes\n- [ ] todo'
    const pos = doc.indexOf('todo')
    expect(extractRunnableSql(stateOf(doc, pos), 'notebook')).toBeNull()
  })

  it('runs raw SQL statement outside fence in notebook mode', () => {
    const doc = '# Meeting Notes\n- [ ] Check DB\n\nSELECT * FROM users WHERE active = 1;\n'
    const pos = doc.indexOf('SELECT')
    const sql = extractRunnableSql(stateOf(doc, pos), 'notebook')
    expect(sql).toContain('SELECT * FROM users WHERE active = 1')
  })

  it('runs selection in notebook mode outside fence if SQL', () => {
    const doc = '# Notes\nSELECT name FROM categories;'
    const from = doc.indexOf('SELECT')
    const to = doc.indexOf(';') + 1
    const st = EditorState.create({ doc, selection: { anchor: from, head: to } })
    expect(extractRunnableSql(st, 'notebook')).toBe('SELECT name FROM categories;')
  })

  it('ignores selection in notebook mode outside fence if non-SQL prose', () => {
    const doc = '# Notes\nJust plain prose text.'
    const from = doc.indexOf('Just')
    const to = from + 10
    const st = EditorState.create({ doc, selection: { anchor: from, head: to } })
    expect(extractRunnableSql(st, 'notebook')).toBeNull()
  })

  it('runs selection in notebook mode inside fence', () => {
    const doc = '```sql\nSELECT 1;\nSELECT 2;\n```'
    const from = doc.indexOf('SELECT 2')
    const to = from + 'SELECT 2;'.length
    const st = EditorState.create({ doc, selection: { anchor: from, head: to } })
    expect(extractRunnableSql(st, 'notebook')).toBe('SELECT 2;')
  })
})

describe('isInSqlContext', () => {
  it('is always true in sql mode', () => {
    expect(isInSqlContext('anything', 0, 'sql')).toBe(true)
  })

  it('is false in prose in notebook mode', () => {
    const doc = '# Title'
    expect(isInSqlContext(doc, 2, 'notebook')).toBe(false)
  })

  it('is true inside fence in notebook mode', () => {
    const doc = '```sql\nSELECT 1\n```'
    const pos = doc.indexOf('SELECT')
    expect(isInSqlContext(doc, pos, 'notebook')).toBe(true)
  })

  it('is true on raw SQL statement outside fence in notebook mode', () => {
    const doc = '# Notes\nSELECT 1;'
    const pos = doc.indexOf('SELECT')
    expect(isInSqlContext(doc, pos, 'notebook')).toBe(true)
  })
})

describe('convertNotebookContentToSql & convertSqlToNotebook', () => {
  it('converts SQL to notebook markdown wrapping in fence', () => {
    const md = convertSqlToNotebook('SELECT * FROM users;', 'User List')
    expect(md).toContain('# User List')
    expect(md).toContain('```sql\nSELECT * FROM users;\n```')
  })

  it('converts notebook markdown to SQL preserving prose as block comments', () => {
    const nb = `# Investigation
Notes about the outage.

\`\`\`sql
SELECT * FROM orders WHERE status = 'failed';
\`\`\`

- [ ] Check logs`

    const sql = convertNotebookContentToSql(nb)
    expect(sql).toContain('/*\n# Investigation\nNotes about the outage.\n*/')
    expect(sql).toContain("SELECT * FROM orders WHERE status = 'failed';")
    expect(sql).toContain('/*\n- [ ] Check logs\n*/')
  })
})
