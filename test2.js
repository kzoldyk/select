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
  
  // Clean up statements (trim whitespace to define true boundaries)
  const cleaned = [];
  for (const s of statements) {
    const match = s.text.match(/^(\s*)(.*?)(\s*)$/s);
    if (!match || !match[2]) continue; // skip empty statements
    const pre = match[1].length;
    const post = match[3].length;
    cleaned.push({
      start: s.start + pre,
      end: s.end - post,
      text: match[2],
      originalEnd: s.end
    });
  }
  
  if (cleaned.length === 0) return '';
  
  // Find closest
  for (let i = 0; i < cleaned.length; i++) {
    const s = cleaned[i];
    // If inside the statement
    if (cursorPos >= s.start && cursorPos <= s.end) {
      return s.text;
    }
    // If in the trailing whitespace before the next statement
    if (i < cleaned.length - 1) {
      const nextS = cleaned[i+1];
      if (cursorPos > s.end && cursorPos < nextS.start) {
        // If cursor is on the same line as the end of this statement, pick this one
        const whitespaceBeforeCursor = sql.substring(s.end, cursorPos);
        if (!whitespaceBeforeCursor.includes('\n')) {
          return s.text;
        }
        // Otherwise pick the next one
        return nextS.text;
      }
    }
  }
  
  // If cursor is after everything
  if (cursorPos >= cleaned[cleaned.length - 1].end) {
     return cleaned[cleaned.length - 1].text;
  }
  
  // If cursor is before everything
  if (cursorPos <= cleaned[0].start) {
     return cleaned[0].text;
  }
  
  return '';
}

const sql = "SELECT 1;\n\nSELECT 2;\n";
console.log(getStatementAtCursor(sql, 9)); // After semicolon of SELECT 1
console.log(getStatementAtCursor(sql, 10)); // After newline
console.log(getStatementAtCursor(sql, 11)); // Before SELECT 2
