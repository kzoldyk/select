function getStatementAtCursor(sql, cursorPos) {
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;
  
  let lastSemi = 0;
  const statements = [];
  
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const nextCh = sql[i + 1] || '';
    
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && nextCh === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (ch === '-' && nextCh === '-' && !inSingle && !inDouble && !inBacktick) {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && nextCh === '*' && !inSingle && !inDouble && !inBacktick) {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === '\'' && !inDouble && !inBacktick) inSingle = !inSingle;
    else if (ch === '"' && !inSingle && !inBacktick) inDouble = !inDouble;
    else if (ch === '`') inBacktick = !inBacktick;
    else if (ch === ';' && !inSingle && !inDouble && !inBacktick) {
      statements.push({ start: lastSemi, end: i + 1, text: sql.substring(lastSemi, i + 1) });
      lastSemi = i + 1;
    }
  }
  
  if (lastSemi < sql.length) {
    statements.push({ start: lastSemi, end: sql.length, text: sql.substring(lastSemi) });
  }
  
  // Find which statement the cursor is in
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    // If the cursor is strictly inside the statement text
    if (cursorPos >= stmt.start && cursorPos <= stmt.end) {
      // If it's just whitespace and we're at the beginning, it might be better to belong to previous
      return stmt;
    }
  }
  return null;
}

const sql = "SELECT 1;\nSELECT 2;\n";
console.log(getStatementAtCursor(sql, 10)); // Between the \n and S of SELECT 2
