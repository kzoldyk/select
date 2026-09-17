import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { sql, MySQL } from '@codemirror/lang-sql'
import { syntaxTree } from '@codemirror/language'

describe('markdown syntax tree', () => {
  it('logs node names', () => {
    const doc = `# Title\n\n- [ ] task\n\n\`\`\`sql\nSELECT 1;\n\`\`\``
    const state = EditorState.create({
      doc,
      extensions: [
        markdown({
          base: markdownLanguage,
          codeLanguages: () => sql({ dialect: MySQL }),
        }),
      ],
    })
    const names: string[] = []
    syntaxTree(state).iterate({
      enter: (node) => { names.push(`${node.name} [${node.from}-${node.to}] "${state.doc.sliceString(node.from, Math.min(node.to, node.from + 20))}"`) },
    })
    expect(names).toMatchInlineSnapshot(`
      [
        "Document [0-41] "# Title

      - [ ] task
      "",
        "ATXHeading1 [0-7] "# Title"",
        "HeaderMark [0-1] "#"",
        "BulletList [9-19] "- [ ] task"",
        "ListItem [9-19] "- [ ] task"",
        "ListMark [9-10] "-"",
        "Task [11-19] "[ ] task"",
        "TaskMarker [11-14] "[ ]"",
        "FencedCode [21-41] "\`\`\`sql
      SELECT 1;
      \`\`\`"",
        "CodeMark [21-24] "\`\`\`"",
        "CodeInfo [24-27] "sql"",
        "CodeText [28-37] "SELECT 1;"",
        "CodeMark [38-41] "\`\`\`"",
      ]
    `)
  })
})
