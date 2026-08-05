function hasMultipleStatements(sql) {
  // Strip comments first to avoid false positives with trailing comments
  const clean = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  
  let inSingle = false
  let inDouble = false
  let inBacktick = false
  let foundSemicolon = false
  
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (ch === '\'' && !inDouble && !inBacktick) { inSingle = !inSingle; continue }
    if (ch === '"' && !inSingle && !inBacktick) { inDouble = !inDouble; continue }
    if (ch === '`') { inBacktick = !inBacktick; continue }
    
    if (ch === ';' && !inSingle && !inDouble && !inBacktick) {
      foundSemicolon = true
    } else if (foundSemicolon && ch.trim() !== '') {
      return true
    }
  }
  return false
}

console.log("SELECT 1;", "->", hasMultipleStatements("SELECT 1;"));
console.log("SELECT 1; -- comment", "->", hasMultipleStatements("SELECT 1; -- comment"));
console.log("SELECT 1; SELECT 2;", "->", hasMultipleStatements("SELECT 1; SELECT 2;"));
console.log("SELECT 1; SELECT 2", "->", hasMultipleStatements("SELECT 1; SELECT 2"));

