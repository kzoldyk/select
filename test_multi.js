function hasMultipleStatements(sql) {
  let inSingle = false
  let inDouble = false
  let inBacktick = false
  let statementCount = 0
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    if (ch === '\'' && !inDouble && !inBacktick) { inSingle = !inSingle; continue }
    if (ch === '"' && !inSingle && !inBacktick) { inDouble = !inDouble; continue }
    if (ch === '`') { inBacktick = !inBacktick; continue }
    if (ch === ';' && !inSingle && !inDouble && !inBacktick) {
      // Only count semicolon if there's actual non-whitespace content after it
      // Actually, standard way is to count statements
      statementCount++
    }
  }
  // Wait, if it ends in ;, it has 1 semicolon. If it has no ;, it has 0.
  // If it's `SELECT 1; SELECT 2;`, it has 2.
  // BUT what if `SELECT 1; SELECT 2`? It has 1 semicolon, but 2 statements.
  return statementCount > 0;
}
console.log("has semicolon:", hasMultipleStatements("SELECT 1;"));
