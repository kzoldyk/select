const sqls = [
  "SELECT * FROM users",
  "SELECT * FROM db.users",
  "SELECT * FROM `my table`",
  "SELECT * FROM `db`.`my table`",
  "SELECT * FROM [my table]",
  "SELECT * FROM (SELECT 1)",
  "SHOW TABLES"
];

function detectTableFromSql(sql) {
  if (!sql) return null;
  const noComments = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
  const clean = noComments.replace(/;+$/, '');
  
  if (/\bSELECT\b/i.test(clean)) {
    const fromRegex = /\bFROM\s+((?:`[^`]+`|"[^"]+"|\[[^\]]+\]|[a-zA-Z0-9_.$]+)(?:\s*\.\s*(?:`[^`]+`|"[^"]+"|\[[^\]]+\]|[a-zA-Z0-9_.$]+))?)/i;
    const fromMatch = clean.match(fromRegex);
    if (fromMatch) {
      let tableName = fromMatch[1];
      if (tableName.includes('.')) {
        tableName = tableName.split('.').pop() || tableName;
      }
      return tableName.replace(/[`"\[\]']/g, '').trim();
    }
  }
  return null;
}

for (const sql of sqls) {
  console.log(sql, "->", detectTableFromSql(sql));
}
