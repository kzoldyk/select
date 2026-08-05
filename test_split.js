function getStatementAtCursor(sql, cursorPos) {
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;
  
  let lastSemi = 0;
  let lastValidStmt = '';
  
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
      const stmt = sql.substring(lastSemi, i + 1).trim();
      if (stmt) lastValidStmt = stmt;
      
      if (cursorPos <= i) {
        return stmt || lastValidStmt;
      }
      lastSemi = i + 1;
    }
  }
  
  const finalStmt = sql.substring(lastSemi).trim();
  if (finalStmt) lastValidStmt = finalStmt;
  
  return finalStmt || lastValidStmt;
}

const sql = `SELECT 1;
SELECT 2;
   `;
console.log("Pos end:", getStatementAtCursor(sql, sql.length));

const sql2 = `SELECT 1;
   
SELECT 2;`;
console.log("Pos between:", getStatementAtCursor(sql2, 11)); // inside the blank lines
