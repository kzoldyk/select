use crate::AppState;
use aes_gcm::{aead::Aead, AeadCore, Aes256Gcm, Key, KeyInit, Nonce};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::Utc;
use mysql_async::prelude::*;
use mysql_async::{params, Conn, Opts, Pool};
use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use std::time::Duration;
use tauri::{Manager, State};
use uuid::Uuid;

const MAX_RESULT_ROWS: usize = 10_000;
const MAX_PAGE_SIZE: usize = 500;
const QUERY_TIMEOUT_SECS: u64 = 30;

fn queries_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    path.push("saved_queries.json");
    Ok(path)
}

fn history_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    path.push("query_history.json");
    Ok(path)
}

fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

fn load_queries_from_disk(app: &tauri::AppHandle) -> Vec<SavedQuery> {
    let path = match queries_path(app) {
        Ok(p) => p,
        Err(_) => return Vec::new(),
    };
    if !path.exists() {
        return Vec::new();
    }
    let content = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    serde_json::from_str(&content).unwrap_or_default()
}

fn save_queries_to_disk(app: &tauri::AppHandle, queries: &[SavedQuery]) -> Result<(), String> {
    let path = queries_path(app)?;
    let content = serde_json::to_string(queries).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

fn load_history_from_disk(app: &tauri::AppHandle) -> Vec<QueryHistoryItem> {
    let path = match history_path(app) {
        Ok(p) => p,
        Err(_) => return Vec::new(),
    };
    if !path.exists() {
        return Vec::new();
    }
    let content = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    serde_json::from_str(&content).unwrap_or_default()
}

fn save_history_to_disk(
    app: &tauri::AppHandle,
    history: &[QueryHistoryItem],
) -> Result<(), String> {
    let path = history_path(app)?;
    let content = serde_json::to_string(history).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

fn append_history(app: &tauri::AppHandle, item: QueryHistoryItem) -> Result<(), String> {
    let mut history = load_history_from_disk(app);
    history.insert(0, item);
    history.truncate(100);
    save_history_to_disk(app, &history)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionConfig {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
    pub db_type: String,
    pub ssl: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Column {
    pub name: String,
    pub r#type: String,
    pub org_name: Option<String>,
    pub org_table: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<Column>,
    pub rows: Vec<serde_json::Value>,
    pub duration_ms: u64,
    pub row_count: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SingleQueryResult {
    pub sql: String,
    pub columns: Option<Vec<Column>>,
    pub rows: Option<Vec<serde_json::Value>>,
    pub row_count: Option<u64>,
    pub affected_rows: Option<u64>,
    pub duration_ms: u64,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QueryHistoryItem {
    pub id: String,
    pub sql: String,
    pub executed_at: String,
    pub duration_ms: u64,
    pub row_count: u64,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaTable {
    pub name: String,
    pub row_count: u64,
    pub r#type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SchemaObject {
    pub name: String,
    pub r#type: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableColumnDetail {
    pub name: String,
    pub column_type: String,
    pub nullable: bool,
    pub default: Option<String>,
    pub pk: bool,
    pub extra: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TableIndexDetail {
    pub name: String,
    pub columns: String,
    pub unique: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TableConstraintDetail {
    pub name: String,
    pub r#type: String,
    pub definition: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TableDetails {
    pub columns: Vec<TableColumnDetail>,
    pub indexes: Vec<TableIndexDetail>,
    pub constraints: Vec<TableConstraintDetail>,
    pub ddl: String,
}

fn sql_tokens_outside_literals(sql: &str) -> Vec<String> {
    let mut cleaned = String::with_capacity(sql.len());
    let mut chars = sql.chars().peekable();
    let mut in_single = false;
    let mut in_double = false;
    let mut in_backtick = false;

    while let Some(ch) = chars.next() {
        if in_single {
            if ch == '\\' {
                chars.next();
            } else if ch == '\'' {
                in_single = false;
            }
            cleaned.push(' ');
            continue;
        }
        if in_double {
            if ch == '\\' {
                chars.next();
            } else if ch == '"' {
                in_double = false;
            }
            cleaned.push(' ');
            continue;
        }
        if in_backtick {
            if ch == '`' {
                in_backtick = false;
            }
            cleaned.push(' ');
            continue;
        }

        match ch {
            '\'' => {
                in_single = true;
                cleaned.push(' ');
            }
            '"' => {
                in_double = true;
                cleaned.push(' ');
            }
            '`' => {
                in_backtick = true;
                cleaned.push(' ');
            }
            '-' if chars.peek() == Some(&'-') => {
                chars.next();
                while let Some(comment_ch) = chars.next() {
                    if comment_ch == '\n' {
                        break;
                    }
                }
                cleaned.push(' ');
            }
            '#' => {
                while let Some(comment_ch) = chars.next() {
                    if comment_ch == '\n' {
                        break;
                    }
                }
                cleaned.push(' ');
            }
            '/' if chars.peek() == Some(&'*') => {
                chars.next();
                let mut prev = '\0';
                while let Some(comment_ch) = chars.next() {
                    if prev == '*' && comment_ch == '/' {
                        break;
                    }
                    prev = comment_ch;
                }
                cleaned.push(' ');
            }
            _ => cleaned.push(ch),
        }
    }

    cleaned
        .split(|ch: char| !ch.is_ascii_alphanumeric() && ch != '_')
        .filter(|token| !token.is_empty())
        .map(|token| token.to_ascii_uppercase())
        .collect()
}

fn has_single_statement(sql: &str) -> bool {
    let mut chars = sql.chars().peekable();
    let mut in_single = false;
    let mut in_double = false;
    let mut in_backtick = false;

    while let Some(ch) = chars.next() {
        if in_single {
            if ch == '\\' {
                chars.next();
            } else if ch == '\'' {
                in_single = false;
            }
            continue;
        }
        if in_double {
            if ch == '\\' {
                chars.next();
            } else if ch == '"' {
                in_double = false;
            }
            continue;
        }
        if in_backtick {
            if ch == '`' {
                in_backtick = false;
            }
            continue;
        }

        match ch {
            '\'' => in_single = true,
            '"' => in_double = true,
            '`' => in_backtick = true,
            '-' if chars.peek() == Some(&'-') => {
                chars.next();
                while let Some(comment_ch) = chars.next() {
                    if comment_ch == '\n' {
                        break;
                    }
                }
            }
            '#' => {
                while let Some(comment_ch) = chars.next() {
                    if comment_ch == '\n' {
                        break;
                    }
                }
            }
            '/' if chars.peek() == Some(&'*') => {
                chars.next();
                let mut prev = '\0';
                while let Some(comment_ch) = chars.next() {
                    if prev == '*' && comment_ch == '/' {
                        break;
                    }
                    prev = comment_ch;
                }
            }
            ';' => {
                return chars.all(|rest| rest.is_whitespace());
            }
            _ => {}
        }
    }

    true
}

fn validate_read_only_query(sql: &str) -> Result<(), String> {
    let tokens = sql_tokens_outside_literals(sql);
    let first = tokens.first().ok_or("Query is empty.")?;
    let allowed = ["SELECT", "SHOW", "DESCRIBE", "DESC", "EXPLAIN", "WITH", "TABLE", "VALUES"];
    if !allowed.contains(&first.as_str()) {
	    return Err(
	        "Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN, WITH, TABLE, VALUES) are allowed."
	            .into(),
	    );
	}

    if !has_single_statement(sql) {
        return Err("Only one SQL statement can be executed at a time.".into());
    }

    let is_show_query = first == "SHOW";

    let blocked = [
        "ALTER", "ANALYZE", "BEGIN", "CALL", "CHECK", "COMMIT", "CREATE", "DEALLOCATE",
        "DELETE", "DROP", "EXECUTE", "FLUSH", "GRANT", "IMPORT", "INSERT", "INSTALL",
        "KILL", "LOAD", "LOCK", "MERGE", "OPTIMIZE", "PREPARE", "PURGE", "RENAME",
        "REPAIR", "REPLACE", "RESET", "REVOKE", "ROLLBACK", "SAVEPOINT", "SET",
        "START", "STOP", "TRUNCATE", "UNINSTALL", "UPDATE",
    ];
    if let Some(token) = tokens
        .iter()
        .find(|token| {
            if is_show_query && *token == "CREATE" {
                false
            } else {
                blocked.contains(&token.as_str())
            }
        })
    {
        return Err(format!("Query contains disallowed keyword '{}'.", token));
    }

    Ok(())
}

fn map_column_type(mysql_type: &str) -> String {
    let upper = mysql_type.to_uppercase();
    if upper.contains("INT") || upper.contains("SERIAL") {
        if upper.contains("UNSIGNED") {
            "unsigned".into()
        } else {
            "integer".into()
        }
    } else if upper.contains("FLOAT")
        || upper.contains("DOUBLE")
        || upper.contains("DECIMAL")
        || upper.contains("NUMERIC")
        || upper.contains("REAL")
    {
        "numeric".into()
    } else if upper.contains("VARCHAR")
        || upper.contains("CHAR")
        || upper.contains("TEXT")
        || upper.contains("BLOB")
        || upper.contains("ENUM")
        || upper.contains("SET")
        || upper.contains("JSON")
    {
        "text".into()
    } else if upper.contains("DATE") || upper.contains("TIMESTAMP") || upper.contains("DATETIME") {
        "timestamp".into()
    } else if upper == "TIME" || upper.starts_with("YEAR") {
        "timestamp".into()
    } else if upper.contains("BOOL") || upper.contains("BIT") {
        "boolean".into()
    } else if upper.contains("BINARY") || upper.contains("VARBINARY") {
        "binary".into()
    } else {
        "text".into()
    }
}

fn validate_connection_config(config: &ConnectionConfig) -> Result<(), String> {
    if config.host.trim().is_empty() || config.username.trim().is_empty() {
        return Err("Host and username are required.".into());
    }
    if config.port == 0 {
        return Err("Port must be between 1 and 65535.".into());
    }
    if config.db_type != "mysql" && config.db_type != "mariadb" {
        return Err("Only MySQL and MariaDB connections are currently supported.".into());
    }
    Ok(())
}

fn encode_url_part(value: &str) -> String {
    utf8_percent_encode(value, NON_ALPHANUMERIC).to_string()
}

fn build_connection_url(config: &ConnectionConfig) -> String {
    format!(
        "mysql://{}:{}@{}:{}/{}",
        encode_url_part(&config.username),
        encode_url_part(&config.password),
        config.host,
        config.port,
        encode_url_part(&config.database),
    )
}

fn quote_identifier(identifier: &str) -> String {
    format!("`{}`", identifier.replace('`', "``"))
}

// Strip password for safe error messages
fn safe_error(err: &dyn std::fmt::Display) -> String {
    let msg = err.to_string();
    if let Some(start) = msg.find("mysql://") {
        if let Some(at_offset) = msg[start..].find('@') {
            let at = start + at_offset;
            return format!("{}mysql://***:***@{}", &msg[..start], &msg[at + 1..]);
        }
    }
    msg
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedQuery {
    pub id: String,
    pub name: String,
    pub sql: String,
    pub created_at: String,
    pub updated_at: String,
}

async fn resolve_connection(
    state: &AppState,
    id: Option<String>,
) -> Result<(String, Pool), String> {
    let pools = state.pools.lock().await;
    let conn_id = match id {
        Some(cid) => cid,
        None => state
            .active_connection_id
            .lock()
            .await
            .clone()
            .ok_or("No active connection")?,
    };
    let pool = pools
        .get(&conn_id)
        .cloned()
        .ok_or("No active connection")?;
    Ok((conn_id, pool))
}

// ── Tauri Commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn run_query(
    app: tauri::AppHandle,
    sql: String,
    id: Option<String>,
    state: State<'_, AppState>,
) -> Result<QueryResult, String> {
    let start = std::time::Instant::now();

    if let Err(err) = validate_read_only_query(&sql) {
        let _ = append_history(
            &app,
            QueryHistoryItem {
                id: format!("qh-{}", Uuid::new_v4()),
                sql,
                executed_at: now_iso(),
                duration_ms: start.elapsed().as_millis() as u64,
                row_count: 0,
                error: Some(err.clone()),
            },
        );
        return Err(err);
    }

    let (conn_id, pool) = resolve_connection(&state, id).await?;

    if let Ok(mut c) = pool.get_conn().await {
        if let Ok(tid) = c.query_first::<u32, _>("SELECT CONNECTION_ID()").await {
            if let Some(t) = tid {
                state.thread_ids.lock().await.insert(conn_id, t);
            }
        }
    }

    let query_future = async {
        let mut conn = pool.get_conn().await.map_err(|e| safe_error(&e))?;
        let mut result = conn.query_iter(&sql).await.map_err(|e| safe_error(&e))?;
        let mut columns = Vec::new();
        for col in result.columns_ref() {
            let type_str = format!("{:?}", col.column_type());
            let org_name_str = col.org_name_str().into_owned();
            let org_table_str = col.org_table_str().into_owned();
            columns.push(Column {
                name: col.name_str().into_owned(),
                r#type: map_column_type(&type_str),
                org_name: if org_name_str.is_empty() { None } else { Some(org_name_str) },
                org_table: if org_table_str.is_empty() { None } else { Some(org_table_str) },
            });
        }

        let column_refs: Vec<(String, String)> = columns
            .iter()
            .map(|c| (c.name.clone(), c.r#type.clone()))
            .collect();
        let mut json_rows = Vec::new();
        let mut truncated = false;

        while let Some(row) = result.next().await.map_err(|e| safe_error(&e))? {
            if json_rows.len() >= MAX_RESULT_ROWS {
                truncated = true;
                break;
            }

            let mut map = serde_json::Map::new();
            for (col_name, col_type) in &column_refs {
                let val = row.get_opt::<mysql_async::Value, _>(col_name.as_str());
                let json_val = match val {
                    Some(Ok(v)) => match v {
                        mysql_async::Value::NULL => Value::Null,
                        mysql_async::Value::Bytes(b) => {
                            if col_type == "binary" {
                                Value::String(format!("[binary {} bytes]", b.len()))
                            } else {
                                Value::String(String::from_utf8_lossy(&b).to_string())
                            }
                        }
                        mysql_async::Value::Int(i) => json!(i),
                        mysql_async::Value::UInt(u) => json!(u),
                        mysql_async::Value::Float(f) => json!(f),
                        mysql_async::Value::Double(d) => json!(d),
                        mysql_async::Value::Date(y, m, d, h, mi, s, micro) => {
                            Value::String(format!(
                                "{:04}-{:02}-{:02} {:02}:{:02}:{:02}.{:06}",
                                y, m, d, h, mi, s, micro
                            ))
                        }
                        mysql_async::Value::Time(neg, d, h, m, s, micro) => {
                            let sign = if neg { "-" } else { "" };
                            Value::String(format!(
                                "{}{:02}:{:02}:{:02}.{:06}",
                                sign,
                                d * 24 + h as u32,
                                m,
                                s,
                                micro
                            ))
                        }
                    },
                    _ => Value::Null,
                };
                map.insert(col_name.clone(), json_val);
            }
            json_rows.push(Value::Object(map));
        }

        result.drop_result().await.map_err(|e| safe_error(&e))?;
        if truncated {
            return Err(format!(
                "Result limit exceeded. Refine the query or add LIMIT {}.",
                MAX_RESULT_ROWS
            ));
        }

        Ok::<(Vec<Column>, Vec<Value>), String>((columns, json_rows))
    };

    let query_result = tokio::time::timeout(Duration::from_secs(QUERY_TIMEOUT_SECS), query_future)
        .await
        .map_err(|_| format!("Query timed out after {} seconds.", QUERY_TIMEOUT_SECS))
        .and_then(|result| result);

    let duration = start.elapsed().as_millis() as u64;

    let (columns, json_rows) = match query_result {
        Ok(result) => result,
        Err(err) => {
            let _ = append_history(
                &app,
                QueryHistoryItem {
                    id: format!("qh-{}", Uuid::new_v4()),
                    sql,
                    executed_at: now_iso(),
                    duration_ms: duration,
                    row_count: 0,
                    error: Some(err.clone()),
                },
            );
            return Err(err);
        }
    };

    let row_count = json_rows.len() as u64;
    let _ = append_history(
        &app,
        QueryHistoryItem {
            id: format!("qh-{}", Uuid::new_v4()),
            sql,
            executed_at: now_iso(),
            duration_ms: duration,
            row_count,
            error: None,
        },
    );

    Ok(QueryResult {
        row_count,
        columns,
        rows: json_rows,
        duration_ms: duration,
    })
}

// ── Multi-Query (semicolon-separated) ──────────────────────────────────────

fn split_statements(sql: &str) -> Vec<String> {
    let mut statements = Vec::new();
    let mut current = String::new();
    let mut in_single_quote = false;
    let mut in_double_quote = false;
    let mut in_backtick = false;
    let mut chars = sql.chars().peekable();
    while let Some(ch) = chars.next() {
        match ch {
            '\'' if !in_double_quote && !in_backtick => in_single_quote = !in_single_quote,
            '"' if !in_single_quote && !in_backtick => in_double_quote = !in_double_quote,
            '`' => in_backtick = !in_backtick,
            ';' if !in_single_quote && !in_double_quote && !in_backtick => {
                let trimmed = current.trim().to_string();
                if !trimmed.is_empty() {
                    statements.push(trimmed);
                }
                current.clear();
                continue;
            }
            _ => {}
        }
        current.push(ch);
    }
    let trimmed = current.trim().to_string();
    if !trimmed.is_empty() {
        statements.push(trimmed);
    }
    statements
}

#[tauri::command]
pub async fn run_multi_query(
    app: tauri::AppHandle,
    sql: String,
    id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<SingleQueryResult>, String> {
    let statements = split_statements(&sql);
    if statements.is_empty() {
        return Err("No statements to execute.".into());
    }

    let (conn_id, pool) = resolve_connection(&state, id).await?;

    if let Ok(mut c) = pool.get_conn().await {
        if let Ok(tid) = c.query_first::<u32, _>("SELECT CONNECTION_ID()").await {
            if let Some(t) = tid {
                state.thread_ids.lock().await.insert(conn_id, t);
            }
        }
    }

    let mut results = Vec::new();
    for stmt in &statements {
        let stmt_start = std::time::Instant::now();
        let is_mutating = validate_read_only_query(stmt).is_err();

        let result = tokio::time::timeout(Duration::from_secs(QUERY_TIMEOUT_SECS), async {
            let mut conn = pool.get_conn().await.map_err(|e| safe_error(&e))?;

            if is_mutating {
                conn.query_iter(stmt).await.map_err(|e| safe_error(&e))?;
                let affected = conn.affected_rows();
                Ok::<SingleQueryResult, String>(SingleQueryResult {
                    sql: stmt.clone(),
                    columns: None,
                    rows: None,
                    row_count: None,
                    affected_rows: Some(affected),
                    duration_ms: stmt_start.elapsed().as_millis() as u64,
                    error: None,
                })
            } else {
                let mut result = conn.query_iter(stmt).await.map_err(|e| safe_error(&e))?;
                let mut columns = Vec::new();
                for col in result.columns_ref() {
                    let type_str = format!("{:?}", col.column_type());
                    let org_name_str = col.org_name_str().into_owned();
                    let org_table_str = col.org_table_str().into_owned();
                    columns.push(Column {
                        name: col.name_str().into_owned(),
                        r#type: map_column_type(&type_str),
                        org_name: if org_name_str.is_empty() { None } else { Some(org_name_str) },
                        org_table: if org_table_str.is_empty() { None } else { Some(org_table_str) },
                    });
                }

                let column_refs: Vec<(String, String)> = columns
                    .iter()
                    .map(|c| (c.name.clone(), c.r#type.clone()))
                    .collect();
                let mut json_rows = Vec::new();

                while let Some(row) = result.next().await.map_err(|e| safe_error(&e))? {
                    if json_rows.len() >= MAX_RESULT_ROWS {
                        break;
                    }
                    let mut map = serde_json::Map::new();
                    for (col_name, col_type) in &column_refs {
                        let val = row.get_opt::<mysql_async::Value, _>(col_name.as_str());
                        let json_val = match val {
                            Some(Ok(v)) => match v {
                                mysql_async::Value::NULL => Value::Null,
                                mysql_async::Value::Bytes(b) => {
                                    if col_type == "binary" {
                                        Value::String(format!("[binary {} bytes]", b.len()))
                                    } else {
                                        Value::String(String::from_utf8_lossy(&b).to_string())
                                    }
                                }
                                mysql_async::Value::Int(i) => json!(i),
                                mysql_async::Value::UInt(u) => json!(u),
                                mysql_async::Value::Float(f) => json!(f),
                                mysql_async::Value::Double(d) => json!(d),
                                mysql_async::Value::Date(y, m, d, h, mi, s, micro) => {
                                    Value::String(format!(
                                        "{:04}-{:02}-{:02} {:02}:{:02}:{:02}.{:06}",
                                        y, m, d, h, mi, s, micro
                                    ))
                                }
                                mysql_async::Value::Time(neg, d, h, m, s, micro) => {
                                    let sign = if neg { "-" } else { "" };
                                    Value::String(format!(
                                        "{}{:02}:{:02}:{:02}.{:06}",
                                        sign,
                                        d * 24 + h as u32,
                                        m,
                                        s,
                                        micro
                                    ))
                                }
                            },
                            _ => Value::Null,
                        };
                        map.insert(col_name.clone(), json_val);
                    }
                    json_rows.push(Value::Object(map));
                }

                result.drop_result().await.map_err(|e| safe_error(&e))?;

                let row_count = json_rows.len() as u64;
                Ok(SingleQueryResult {
                    sql: stmt.clone(),
                    columns: Some(columns),
                    rows: Some(json_rows),
                    row_count: Some(row_count),
                    affected_rows: None,
                    duration_ms: stmt_start.elapsed().as_millis() as u64,
                    error: None,
                })
            }
        })
        .await
        .map_err(|_| format!("Query timed out after {} seconds.", QUERY_TIMEOUT_SECS))
        .and_then(|r| r);

        match result {
            Ok(res) => {
                let _ = append_history(
                    &app,
                    QueryHistoryItem {
                        id: format!("qh-{}", Uuid::new_v4()),
                        sql: stmt.clone(),
                        executed_at: now_iso(),
                        duration_ms: res.duration_ms,
                        row_count: res.row_count.unwrap_or(res.affected_rows.unwrap_or(0)),
                        error: None,
                    },
                );
                results.push(res);
            }
            Err(e) => {
                let _ = append_history(
                    &app,
                    QueryHistoryItem {
                        id: format!("qh-{}", Uuid::new_v4()),
                        sql: stmt.clone(),
                        executed_at: now_iso(),
                        duration_ms: stmt_start.elapsed().as_millis() as u64,
                        row_count: 0,
                        error: Some(e.clone()),
                    },
                );
                results.push(SingleQueryResult {
                    sql: stmt.clone(),
                    columns: None,
                    rows: None,
                    row_count: None,
                    affected_rows: None,
                    duration_ms: stmt_start.elapsed().as_millis() as u64,
                    error: Some(e),
                });
            }
        }
    }

    Ok(results)
}

// ── Paged Query ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct PagedQueryResult {
    pub columns: Vec<Column>,
    pub rows: Vec<Value>,
    pub row_count: usize,
    pub duration_ms: u64,
    pub has_more: bool,
    pub offset: usize,
    pub limit: usize,
}

#[tauri::command]
pub async fn run_query_paged(
    app: tauri::AppHandle,
    sql: String,
    limit: Option<usize>,
    offset: Option<usize>,
    id: Option<String>,
    state: State<'_, AppState>,
) -> Result<PagedQueryResult, String> {
    let page_size = limit.unwrap_or(100).min(MAX_PAGE_SIZE);
    let page_offset = offset.unwrap_or(0);
    let start = std::time::Instant::now();

    if let Err(err) = validate_read_only_query(&sql) {
        let _ = append_history(
            &app,
            QueryHistoryItem {
                id: format!("qh-{}", Uuid::new_v4()),
                sql,
                executed_at: now_iso(),
                duration_ms: start.elapsed().as_millis() as u64,
                row_count: 0,
                error: Some(err.clone()),
            },
        );
        return Err(err);
    }

    let (conn_id, pool) = resolve_connection(&state, id).await?;

    if let Ok(mut c) = pool.get_conn().await {
        if let Ok(tid) = c.query_first::<u32, _>("SELECT CONNECTION_ID()").await {
            if let Some(t) = tid {
                state.thread_ids.lock().await.insert(conn_id, t);
            }
        }
    }

    let fetch_limit = page_size + 1;
    let clean_sql = sql.trim().trim_end_matches(';');
    let paged_sql = format!("{} LIMIT {} OFFSET {}", clean_sql, fetch_limit, page_offset);

    let query_future = async {
        let mut conn = pool.get_conn().await.map_err(|e| safe_error(&e))?;
        
        let mut result_is_fallback = false;
        let mut result = match conn.query_iter(&paged_sql).await {
            Ok(r) => r,
            Err(e) => {
                let err_msg = safe_error(&e);
                if err_msg.to_lowercase().contains("syntax") || err_msg.to_lowercase().contains("parse") {
                    // Fallback to original query (user might already have LIMIT)
                    result_is_fallback = true;
                    conn.query_iter(clean_sql).await.map_err(|e| safe_error(&e))?
                } else {
                    return Err(err_msg);
                }
            }
        };
        let mut columns = Vec::new();
        for col in result.columns_ref() {
            let type_str = format!("{:?}", col.column_type());
            let org_name_str = col.org_name_str().into_owned();
            let org_table_str = col.org_table_str().into_owned();
            columns.push(Column {
                name: col.name_str().into_owned(),
                r#type: map_column_type(&type_str),
                org_name: if org_name_str.is_empty() { None } else { Some(org_name_str) },
                org_table: if org_table_str.is_empty() { None } else { Some(org_table_str) },
            });
        }

        let column_refs: Vec<(String, String)> = columns
            .iter()
            .map(|c| (c.name.clone(), c.r#type.clone()))
            .collect();
        let mut json_rows = Vec::new();
        let mut skipped = 0;

        while let Some(row) = result.next().await.map_err(|e| safe_error(&e))? {
            if result_is_fallback && skipped < page_offset {
                skipped += 1;
                continue;
            }
            if json_rows.len() >= fetch_limit {
                break;
            }
            let mut map = serde_json::Map::new();
            for (col_name, col_type) in &column_refs {
                let val = row.get_opt::<mysql_async::Value, _>(col_name.as_str());
                let json_val = match val {
                    Some(Ok(v)) => match v {
                        mysql_async::Value::NULL => Value::Null,
                        mysql_async::Value::Bytes(b) => {
                            if col_type == "binary" {
                                Value::String(format!("[binary {} bytes]", b.len()))
                            } else {
                                Value::String(String::from_utf8_lossy(&b).to_string())
                            }
                        }
                        mysql_async::Value::Int(i) => json!(i),
                        mysql_async::Value::UInt(u) => json!(u),
                        mysql_async::Value::Float(f) => json!(f),
                        mysql_async::Value::Double(d) => json!(d),
                        mysql_async::Value::Date(y, m, d, h, mi, s, micro) => {
                            Value::String(format!(
                                "{:04}-{:02}-{:02} {:02}:{:02}:{:02}.{:06}",
                                y, m, d, h, mi, s, micro
                            ))
                        }
                        mysql_async::Value::Time(neg, d, h, m, s, micro) => {
                            let sign = if neg { "-" } else { "" };
                            Value::String(format!(
                                "{}{:02}:{:02}:{:02}.{:06}",
                                sign,
                                d * 24 + h as u32,
                                m,
                                s,
                                micro
                            ))
                        }
                    },
                    _ => Value::Null,
                };
                map.insert(col_name.clone(), json_val);
            }
            json_rows.push(Value::Object(map));
        }

        result.drop_result().await.map_err(|e| safe_error(&e))?;

        Ok::<(Vec<Column>, Vec<Value>), String>((columns, json_rows))
    };

    let query_result = tokio::time::timeout(Duration::from_secs(QUERY_TIMEOUT_SECS), query_future)
        .await
        .map_err(|_| format!("Query timed out after {} seconds.", QUERY_TIMEOUT_SECS))
        .and_then(|r| r)?;

    let (columns, json_rows) = query_result;
    let has_more = json_rows.len() > page_size;
    let rows: Vec<Value> = if has_more {
        json_rows.into_iter().take(page_size).collect()
    } else {
        json_rows
    };
    let row_count = rows.len();
    let duration = start.elapsed().as_millis() as u64;

    let _ = append_history(
        &app,
        QueryHistoryItem {
            id: format!("qh-{}", Uuid::new_v4()),
            sql,
            executed_at: now_iso(),
            duration_ms: duration,
            row_count: row_count as u64,
            error: None,
        },
    );

    Ok(PagedQueryResult {
        columns,
        rows,
        row_count,
        duration_ms: duration,
        has_more,
        offset: page_offset,
        limit: page_size,
    })
}

fn is_mutating_query(sql: &str) -> bool {
    let tokens = sql_tokens_outside_literals(sql);
    let mutating = [
        "ALTER", "CREATE", "DELETE", "DROP", "GRANT", "INSERT", "LOAD", "LOCK",
        "RENAME", "REPLACE", "REVOKE", "TRUNCATE", "UPDATE", "CALL",
    ];
    let first = match tokens.first() {
        Some(t) => t.as_str(),
        None => return false,
    };
    if mutating.contains(&first) {
        return true;
    }
    tokens.iter().any(|t| mutating.contains(&t.as_str()))
}

fn has_where_clause(sql: &str) -> bool {
    let tokens = sql_tokens_outside_literals(sql);
    tokens.iter().any(|t| t == "WHERE")
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WriteQueryResult {
    pub affected_rows: u64,
    pub duration_ms: u64,
    pub warning: Option<String>,
}

#[tauri::command]
pub async fn run_write_query(
    app: tauri::AppHandle,
    sql: String,
    id: Option<String>,
    state: State<'_, AppState>,
) -> Result<WriteQueryResult, String> {
    let start = std::time::Instant::now();

    if !is_mutating_query(&sql) {
        return Err("Not a mutating query. Use run_query for read-only queries.".into());
    }

    let (conn_id, pool) = resolve_connection(&state, id).await?;

    if let Ok(mut c) = pool.get_conn().await {
        if let Ok(tid) = c.query_first::<u32, _>("SELECT CONNECTION_ID()").await {
            if let Some(t) = tid {
                state.thread_ids.lock().await.insert(conn_id, t);
            }
        }
    }

    let mut warning = None;
    if !has_where_clause(&sql) {
        let first_word = sql_tokens_outside_literals(&sql)
            .first()
            .cloned()
            .unwrap_or_default();
        warning = Some(format!(
            "This query has no WHERE clause and may affect many rows. ({})",
            first_word
        ));
    }

    let mut conn = pool
        .get_conn()
        .await
        .map_err(|e| safe_error(&e))?;

    let result = tokio::time::timeout(Duration::from_secs(QUERY_TIMEOUT_SECS), async {
        conn.query_iter(&sql).await.map_err(|e| safe_error(&e))
    })
    .await
    .map_err(|_| format!("Query timed out after {} seconds.", QUERY_TIMEOUT_SECS))
    .and_then(|r| r)?;

    let affected = result.affected_rows();
    let duration = start.elapsed().as_millis() as u64;

    let _ = append_history(
        &app,
        QueryHistoryItem {
            id: format!("qh-{}", Uuid::new_v4()),
            sql,
            executed_at: now_iso(),
            duration_ms: duration,
            row_count: affected,
            error: warning.clone(),
        },
    );

    Ok(WriteQueryResult {
        affected_rows: affected,
        duration_ms: duration,
        warning,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCell {
    pub column: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PkValue {
    pub column: String,
    pub value: serde_json::Value,
}

#[tauri::command]
pub async fn update_rows(
    table: String,
    updates: Vec<UpdateCell>,
    pks: Vec<PkValue>,
    id: Option<String>,
    state: State<'_, AppState>,
) -> Result<WriteQueryResult, String> {
    let start = std::time::Instant::now();

    if updates.is_empty() || pks.is_empty() {
        return Err("No updates or primary key values provided.".into());
    }

    let (conn_id, pool) = resolve_connection(&state, id).await?;

    if let Ok(mut c) = pool.get_conn().await {
        if let Ok(tid) = c.query_first::<u32, _>("SELECT CONNECTION_ID()").await {
            if let Some(t) = tid {
                state.thread_ids.lock().await.insert(conn_id, t);
            }
        }
    }

    fn json_to_sql(val: &serde_json::Value, _col: &str) -> String {
        match val {
            serde_json::Value::Null => "NULL".into(),
            serde_json::Value::Bool(b) => if *b { "1".into() } else { "0".into() },
            serde_json::Value::Number(n) => n.to_string(),
            serde_json::Value::String(s) => format!("'{}'", s.replace('\'', "\\'")),
            _ => format!("'{}'", val.to_string().replace('\'', "\\'")),
        }
    }

    fn escape_identifier(s: &str) -> String {
        if s.contains('.') {
            s.split('.')
                .map(|part| format!("`{}`", part.replace('`', "``")))
                .collect::<Vec<_>>()
                .join(".")
        } else {
            format!("`{}`", s.replace('`', "``"))
        }
    }

    let set_clause: Vec<String> = updates.iter().map(|u| {
        format!("{} = {}", escape_identifier(&u.column), json_to_sql(&u.value, &u.column))
    }).collect();

    let where_clause: Vec<String> = pks.iter().map(|pk| {
        format!("{} = {}", escape_identifier(&pk.column), json_to_sql(&pk.value, &pk.column))
    }).collect();

    let sql = format!(
        "UPDATE {} SET {} WHERE {}",
        escape_identifier(&table),
        set_clause.join(", "),
        where_clause.join(" AND ")
    );

    let mut conn = pool.get_conn().await.map_err(|e| safe_error(&e))?;

    let result = tokio::time::timeout(Duration::from_secs(QUERY_TIMEOUT_SECS), async {
        conn.query_iter(&sql).await.map_err(|e| safe_error(&e))
    })
    .await
    .map_err(|_| format!("Query timed out after {} seconds.", QUERY_TIMEOUT_SECS))
    .and_then(|r| r)?;

    let affected = result.affected_rows();
    let duration = start.elapsed().as_millis() as u64;

    Ok(WriteQueryResult {
        affected_rows: affected,
        duration_ms: duration,
        warning: None,
    })
}

#[tauri::command]
pub async fn connect(
    id: String,
    config: ConnectionConfig,
    state: State<'_, AppState>,
) -> Result<String, String> {
    validate_connection_config(&config)?;
    let url = build_connection_url(&config);
    let opts = Opts::from_url(&url).map_err(|e| safe_error(&e))?;
    let pool = Pool::new(opts);

    {
        let mut conn = pool.get_conn().await.map_err(|e| safe_error(&e))?;
        let thread_id: u32 = conn
            .query_first("SELECT CONNECTION_ID()")
            .await
            .map_err(|e| safe_error(&e))?
            .unwrap_or(0);
        state.connection_urls.lock().await.insert(id.clone(), url);
        state.thread_ids.lock().await.insert(id.clone(), thread_id);
    }

    state.pools.lock().await.insert(id.clone(), pool);
    *state.active_connection_id.lock().await = Some(id.clone());
    Ok(id)
}

#[tauri::command]
pub async fn refresh_thread_id(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = {
        let pools = state.pools.lock().await;
        pools.get(&id).cloned().ok_or("No active connection")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| safe_error(&e))?;
    let thread_id: u32 = conn
        .query_first("SELECT CONNECTION_ID()")
        .await
        .map_err(|e| safe_error(&e))?
        .unwrap_or(0);
    state.thread_ids.lock().await.insert(id, thread_id);
    Ok(())
}

#[tauri::command]
pub async fn cancel_query(
    state: State<'_, AppState>,
) -> Result<(), String> {
    let (url, thread_id) = {
        let active_id = state.active_connection_id.lock().await;
        let id = active_id.as_ref().ok_or("No active connection")?.clone();
        let urls = state.connection_urls.lock().await;
        let url = urls.get(&id).cloned().ok_or("Connection URL not found")?;
        let threads = state.thread_ids.lock().await;
        let tid = threads.get(&id).copied().ok_or("Thread ID not found")?;
        (url, tid)
    };

    let opts = Opts::from_url(&url).map_err(|e| safe_error(&e))?;
    let kill_pool = Pool::new(opts);
    let mut kill_conn = kill_pool.get_conn().await.map_err(|e| safe_error(&e))?;

    kill_conn
        .query_drop(format!("KILL QUERY {}", thread_id))
        .await
        .map_err(|e| safe_error(&e))?;

    kill_pool.disconnect().await.map_err(|e| safe_error(&e))?;
    Ok(())
}

#[tauri::command]
pub async fn disconnect(id: String, state: State<'_, AppState>) -> Result<(), String> {
    if let Some(pool) = state.pools.lock().await.remove(&id) {
        pool.disconnect().await.map_err(|e| safe_error(&e))?;
    }
    state.connection_urls.lock().await.remove(&id);
    state.thread_ids.lock().await.remove(&id);
    let mut active_id = state.active_connection_id.lock().await;
    if active_id.as_deref() == Some(&id) {
        *active_id = None;
    }
    Ok(())
}

#[tauri::command]
pub async fn test_connection(config: ConnectionConfig) -> Result<u64, String> {
    validate_connection_config(&config)?;
    let start = std::time::Instant::now();
    let url = build_connection_url(&config);
    let opts = Opts::from_url(&url).map_err(|e| safe_error(&e))?;
    let conn = Conn::new(opts).await.map_err(|e| safe_error(&e))?;
    conn.disconnect().await.map_err(|e| safe_error(&e))?;
    Ok(start.elapsed().as_millis() as u64)
}

#[tauri::command]
pub async fn change_database(
    database: String,
    id: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if database.trim().is_empty() {
        return Err("Database name is required.".into());
    }

    let (_conn_id, pool) = resolve_connection(&state, id).await?;

    let mut conn = pool.get_conn().await.map_err(|e| safe_error(&e))?;
    conn.query_drop(format!("USE {}", quote_identifier(&database)))
        .await
        .map_err(|e| safe_error(&e))
}

#[tauri::command]
pub async fn set_autocommit(
    enabled: bool,
    id: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let (_conn_id, pool) = resolve_connection(&state, id).await?;

    let mut conn = pool.get_conn().await.map_err(|e| safe_error(&e))?;
    conn.query_drop(format!("SET AUTOCOMMIT={}", if enabled { 1 } else { 0 }))
        .await
        .map_err(|e| safe_error(&e))
}

#[tauri::command]
pub async fn fetch_databases(
    id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let (_conn_id, pool) = resolve_connection(&state, id).await?;

    let mut conn = pool.get_conn().await.map_err(|e| safe_error(&e))?;
    let dbs: Vec<String> = conn
        .query("SHOW DATABASES")
        .await
        .map_err(|e| safe_error(&e))?;
    Ok(dbs)
}

#[tauri::command]
pub async fn fetch_schema_tables(
    schema: String,
    id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let (_conn_id, pool) = resolve_connection(&state, id).await?;

    let mut conn = pool.get_conn().await.map_err(|e| safe_error(&e))?;
    let tables: Vec<String> = conn
        .exec(
            r#"
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = :schema
        ORDER BY table_name
        "#,
            params! { "schema" => schema },
        )
        .await
        .map_err(|e| safe_error(&e))?;
    Ok(tables)
}

#[tauri::command]
pub async fn fetch_schema(
    id: String,
    database: Option<String>,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let pool = {
        let pools = state.pools.lock().await;
        pools.get(&id).cloned().ok_or("No active connection")?
    };

    let mut conn = pool.get_conn().await.map_err(|e| safe_error(&e))?;

    let db_to_query = match database {
        Some(ref db) if !db.trim().is_empty() => db.clone(),
        _ => {
            let mut c = pool.get_conn().await.map_err(|e| safe_error(&e))?;
            c.query_first::<String, _>("SELECT DATABASE()")
                .await
                .map_err(|e| safe_error(&e))?
                .unwrap_or_default()
        }
    };

    let table_rows: Vec<(String, Option<u64>, String)> = conn
        .exec(
            r#"
        SELECT table_name, table_rows, table_type
        FROM information_schema.tables
        WHERE table_schema = :db
        ORDER BY table_name
        "#,
            params! { "db" => &db_to_query },
        )
        .await
        .map_err(|e| safe_error(&e))?;

    let mut tables = Vec::new();
    let mut views = Vec::new();
    for (name, row_count, table_type) in table_rows {
        if table_type.eq_ignore_ascii_case("VIEW") {
            views.push(SchemaObject {
                name,
                r#type: "view".into(),
            });
        } else {
            tables.push(SchemaTable {
                name,
                row_count: row_count.unwrap_or(0),
                r#type: "table".into(),
            });
        }
    }

    let routines: Vec<(String, String)> = conn
        .exec(
            r#"
        SELECT routine_name, LOWER(routine_type)
        FROM information_schema.routines
        WHERE routine_schema = :db
        ORDER BY routine_name
        "#,
            params! { "db" => &db_to_query },
        )
        .await
        .map_err(|e| safe_error(&e))?;

    let mut functions = Vec::new();
    let mut procs = Vec::new();
    for (name, routine_type) in routines {
        if routine_type.eq_ignore_ascii_case("procedure") {
            procs.push(SchemaObject {
                name,
                r#type: "proc".into(),
            });
        } else {
            functions.push(SchemaObject {
                name,
                r#type: "function".into(),
            });
        }
    }

    let triggers: Vec<SchemaObject> = conn
        .exec_map(
            r#"
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE trigger_schema = :db
        ORDER BY trigger_name
        "#,
            params! { "db" => &db_to_query },
            |(name,): (String,)| SchemaObject {
                name,
                r#type: "trigger".into(),
            },
        )
        .await
        .map_err(|e| safe_error(&e))?;

    let indexes: Vec<SchemaObject> = conn
        .exec_map(
            r#"
        SELECT DISTINCT index_name
        FROM information_schema.statistics
        WHERE table_schema = :db
        ORDER BY index_name
        "#,
            params! { "db" => &db_to_query },
            |name: String| SchemaObject {
                name,
                r#type: "index".into(),
            },
        )
        .await
        .map_err(|e| safe_error(&e))?;

    Ok(serde_json::json!({
        "tables": tables,
        "views": views,
        "functions": functions,
        "indexes": indexes,
        "triggers": triggers,
        "procs": procs,
    }))
}

#[tauri::command]
pub async fn fetch_table_details(
    table: String,
    id: Option<String>,
    database: Option<String>,
    state: State<'_, AppState>,
) -> Result<TableDetails, String> {
    let (_conn_id, pool) = resolve_connection(&state, id).await?;

    let mut conn = pool.get_conn().await.map_err(|e| safe_error(&e))?;

    let (schema_opt, table_name) = match table.split_once('.') {
        Some((s, t)) => (Some(s.to_string()), t.to_string()),
        None => (database.clone(), table.clone()),
    };

    let schema_param = schema_opt.as_deref().unwrap_or("");

    let exists: Option<u8> = conn
        .exec_first(
            r#"
        SELECT 1
        FROM information_schema.tables
        WHERE (
            (:schema = '' AND table_schema = DATABASE()) OR
            (:schema != '' AND table_schema = :schema)
        ) AND table_name = :table
        LIMIT 1
        "#,
            params! { "schema" => schema_param, "table" => &table_name },
        )
        .await
        .map_err(|e| safe_error(&e))?;

    if exists.is_none() {
        return Err(format!("Table '{}' not found.", table));
    }

    let columns = conn
        .exec_map(
            r#"
        SELECT column_name, column_type, is_nullable, column_default, column_key, extra
        FROM information_schema.columns
        WHERE (
            (:schema = '' AND table_schema = DATABASE()) OR
            (:schema != '' AND table_schema = :schema)
        ) AND table_name = :table
        ORDER BY ordinal_position
        "#,
            params! { "schema" => schema_param, "table" => &table_name },
            |(name, column_type, is_nullable, default, column_key, extra): (
                String,
                String,
                String,
                Option<String>,
                String,
                String,
            )| {
                TableColumnDetail {
                    name,
                    column_type,
                    nullable: is_nullable.eq_ignore_ascii_case("YES"),
                    default,
                    pk: column_key.eq_ignore_ascii_case("PRI"),
                    extra,
                }
            },
        )
        .await
        .map_err(|e| safe_error(&e))?;

    let indexes = conn
        .exec_map(
            r#"
        SELECT index_name,
               GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ', ') AS columns,
               IF(MAX(non_unique) = 0, 1, 0) AS is_unique
        FROM information_schema.statistics
        WHERE (
            (:schema = '' AND table_schema = DATABASE()) OR
            (:schema != '' AND table_schema = :schema)
        ) AND table_name = :table
        GROUP BY index_name
        ORDER BY IF(index_name = 'PRIMARY', 0, 1), index_name
        "#,
            params! { "schema" => schema_param, "table" => &table_name },
            |(name, columns, unique): (String, Option<String>, u8)| TableIndexDetail {
                name,
                columns: columns.unwrap_or_default(),
                unique: unique == 1,
            },
        )
        .await
        .map_err(|e| safe_error(&e))?;

    let constraints = conn.exec_map(
        r#"
        SELECT tc.constraint_name,
               tc.constraint_type,
               COALESCE(GROUP_CONCAT(kcu.column_name ORDER BY kcu.ordinal_position SEPARATOR ', '), '') AS columns
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON kcu.constraint_schema = tc.constraint_schema
         AND kcu.constraint_name = tc.constraint_name
         AND kcu.table_schema = tc.table_schema
         AND kcu.table_name = tc.table_name
        WHERE (
            (:schema = '' AND tc.table_schema = DATABASE()) OR
            (:schema != '' AND tc.table_schema = :schema)
        ) AND tc.table_name = :table
        GROUP BY tc.constraint_name, tc.constraint_type
        ORDER BY tc.constraint_type, tc.constraint_name
        "#,
        params! { "schema" => schema_param, "table" => &table_name },
        |(name, constraint_type, columns): (String, String, String)| {
            let definition = if columns.is_empty() {
                constraint_type.clone()
            } else {
                format!("{} ({})", constraint_type, columns)
            };
            TableConstraintDetail {
                name,
                r#type: constraint_type,
                definition,
            }
        },
    ).await.map_err(|e| safe_error(&e))?;

    let ddl_query = if let Some(schema) = schema_opt {
        format!("SHOW CREATE TABLE {}.{}", quote_identifier(&schema), quote_identifier(&table_name))
    } else {
        format!("SHOW CREATE TABLE {}", quote_identifier(&table_name))
    };

    let ddl_row: Option<mysql_async::Row> = conn
        .query_first(ddl_query)
        .await
        .map_err(|e| safe_error(&e))?;
    let ddl = ddl_row
        .and_then(|row| row.get_opt::<String, usize>(1).and_then(Result::ok))
        .unwrap_or_default();

    Ok(TableDetails {
        columns,
        indexes,
        constraints,
        ddl,
    })
}

#[tauri::command]
pub async fn get_history(app: tauri::AppHandle) -> Result<Vec<QueryHistoryItem>, String> {
    Ok(load_history_from_disk(&app))
}

#[tauri::command]
pub async fn save_query(
    app: tauri::AppHandle,
    name: String,
    sql: String,
) -> Result<SavedQuery, String> {
    let mut queries = load_queries_from_disk(&app);
    let now = now_iso();
    // Check if a query with this name already exists (update it)
    if let Some(existing) = queries.iter_mut().find(|q| q.name == name) {
        existing.sql = sql;
        existing.updated_at = now.clone();
        let result = existing.clone();
        save_queries_to_disk(&app, &queries)?;
        return Ok(result);
    }
    let id = format!("sq-{}", Uuid::new_v4());
    let saved = SavedQuery {
        id: id.clone(),
        name,
        sql,
        created_at: now.clone(),
        updated_at: now,
    };
    queries.push(saved.clone());
    save_queries_to_disk(&app, &queries)?;
    Ok(saved)
}

#[tauri::command]
pub async fn load_queries(app: tauri::AppHandle) -> Result<Vec<SavedQuery>, String> {
    Ok(load_queries_from_disk(&app))
}

#[tauri::command]
pub async fn rename_query(
    app: tauri::AppHandle,
    id: String,
    new_name: String,
) -> Result<(), String> {
    let mut queries = load_queries_from_disk(&app);
    if let Some(q) = queries.iter_mut().find(|q| q.id == id) {
        q.name = new_name;
        q.updated_at = now_iso();
        save_queries_to_disk(&app, &queries)?;
        Ok(())
    } else {
        Err("Query not found".into())
    }
}

#[tauri::command]
pub async fn delete_query(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut queries = load_queries_from_disk(&app);
    let len = queries.len();
    queries.retain(|q| q.id != id);
    if queries.len() != len {
        save_queries_to_disk(&app, &queries)?;
        Ok(())
    } else {
        Err("Query not found".into())
    }
}

#[tauri::command]
pub async fn export_csv(result: QueryResult) -> Result<String, String> {
    fn csv_escape(value: &str) -> String {
        if value.contains(',')
            || value.contains('"')
            || value.contains('\n')
            || value.contains('\r')
        {
            format!("\"{}\"", value.replace('"', "\"\""))
        } else {
            value.to_string()
        }
    }

    let header = result
        .columns
        .iter()
        .map(|c| csv_escape(&c.name))
        .collect::<Vec<_>>()
        .join(",");
    let rows: Vec<String> = result
        .rows
        .iter()
        .map(|row| {
            result
                .columns
                .iter()
                .map(|col| match row.get(&col.name) {
                    Some(Value::Null) => String::new(),
                    Some(Value::String(s)) => csv_escape(s),
                    Some(v) => csv_escape(&v.to_string()),
                    None => String::new(),
                })
                .collect::<Vec<_>>()
                .join(",")
        })
        .collect();

    // Prepend UTF-8 BOM for Excel compatibility
    Ok(format!("\u{FEFF}{}\n{}", header, rows.join("\n")))
}

#[tauri::command]
pub async fn kill_session(
    thread_id: u32,
    id: Option<String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let (_conn_id, pool) = resolve_connection(&state, id).await?;
    let mut conn = pool.get_conn().await.map_err(|e| safe_error(&e))?;
    conn.query_iter(format!("KILL CONNECTION {}", thread_id))
        .await
        .map_err(|e| safe_error(&e))?;
    Ok(format!("Killed session {}", thread_id))
}

// ── Password Encryption ──────────────────────────────────────────────────────

fn encryption_key_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    path.push(".select-key");
    Ok(path)
}

fn get_or_create_encryption_key(app: &tauri::AppHandle) -> Result<Vec<u8>, String> {
    let path = encryption_key_path(app)?;
    if path.exists() {
        let content = std::fs::read(&path).map_err(|e| e.to_string())?;
        if content.len() == 32 {
            return Ok(content);
        }
    }
    let mut key = vec![0u8; 32];
    OsRng.fill_bytes(&mut key);
    let hash = Sha256::digest(&key);
    let obfuscated = hash.as_slice().to_vec();
    std::fs::write(&path, &obfuscated).map_err(|e| e.to_string())?;
    Ok(obfuscated)
}

fn encrypt_with_key(key_bytes: &[u8], plaintext: &str) -> Result<String, String> {
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce_bytes = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce_bytes, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;
    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);
    Ok(BASE64.encode(&combined))
}

fn decrypt_with_key(key_bytes: &[u8], ciphertext_b64: &str) -> Result<String, String> {
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let combined = BASE64
        .decode(ciphertext_b64)
        .map_err(|e| format!("Invalid base64: {}", e))?;
    if combined.len() < 12 {
        return Err("Invalid ciphertext".into());
    }
    let (nonce_bytes, ct) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ct)
        .map_err(|e| format!("Decryption failed: {}", e))?;
    String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8: {}", e))
}

#[tauri::command]
pub async fn encrypt_password(
    app: tauri::AppHandle,
    plaintext: String,
) -> Result<String, String> {
    let key_bytes = get_or_create_encryption_key(&app)?;
    encrypt_with_key(&key_bytes, &plaintext)
}

#[tauri::command]
pub async fn decrypt_password(
    app: tauri::AppHandle,
    ciphertext_b64: String,
) -> Result<String, String> {
    let key_bytes = get_or_create_encryption_key(&app)?;
    decrypt_with_key(&key_bytes, &ciphertext_b64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn read_only_validation_allows_safe_single_statements() {
        assert!(validate_read_only_query("SELECT * FROM users WHERE name = 'DROP'").is_ok());
        assert!(validate_read_only_query("SHOW TABLES").is_ok());
        assert!(validate_read_only_query("EXPLAIN SELECT * FROM users").is_ok());
        assert!(validate_read_only_query("SELECT 1;   ").is_ok());
    }

    #[test]
    fn read_only_validation_rejects_multi_statement_bypass() {
        let err = validate_read_only_query("SELECT 1; DROP TABLE users").unwrap_err();
        assert!(err.contains("one SQL statement"));
    }

    #[test]
    fn read_only_validation_rejects_mutating_keywords_outside_literals() {
        assert!(validate_read_only_query("UPDATE users SET name = 'x'").is_err());
        assert!(validate_read_only_query("WITH x AS (DELETE FROM users) SELECT 1").is_err());
        assert!(validate_read_only_query("SELECT * FROM users /* DROP TABLE users */").is_ok());
    }

    #[test]
    fn read_only_validation_allows_new_mysql_features() {
        assert!(validate_read_only_query("TABLE users").is_ok());
        assert!(validate_read_only_query("VALUES ROW(1, 2, 3)").is_ok());
    }

    #[test]
    fn read_only_validation_rejects_set_statement() {
        assert!(validate_read_only_query("SET @var = 1").is_err());
        assert!(validate_read_only_query("SET NAMES utf8").is_err());
    }

    #[test]
    fn read_only_validation_rejects_transaction_control() {
        assert!(validate_read_only_query("BEGIN").is_err());
        assert!(validate_read_only_query("COMMIT").is_err());
        assert!(validate_read_only_query("ROLLBACK").is_err());
    }

    #[test]
    fn read_only_validation_rejects_prepared_statements() {
        assert!(validate_read_only_query("PREPARE stmt FROM 'SELECT 1'").is_err());
        assert!(validate_read_only_query("EXECUTE stmt").is_err());
        assert!(validate_read_only_query("DEALLOCATE PREPARE stmt").is_err());
    }

    #[test]
    fn connection_url_encodes_credentials() {
        let config = ConnectionConfig {
            name: "test".into(),
            host: "localhost".into(),
            port: 3306,
            database: "my db".into(),
            username: "root@example".into(),
            password: "p@ss:word/with space".into(),
            db_type: "mysql".into(),
            ssl: false,
        };

        let url = build_connection_url(&config);
        assert!(url.contains("root%40example"));
        assert!(url.contains("p%40ss%3Aword%2Fwith%20space"));
        assert!(url.ends_with("/my%20db"));
    }

    #[test]
    fn password_encryption_roundtrip() {
        let key = [0x42u8; 32];
        let plaintext = "MyS3cret!P@ssw0rd#123";
        let encrypted = encrypt_with_key(&key, plaintext).unwrap();
        assert_ne!(encrypted, plaintext);
        let decrypted = decrypt_with_key(&key, &encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn password_encryption_produces_different_outputs() {
        let key = [0x42u8; 32];
        let plaintext = "password123";
        let a = encrypt_with_key(&key, plaintext).unwrap();
        let b = encrypt_with_key(&key, plaintext).unwrap();
        assert_ne!(a, b);
    }

    #[test]
    fn password_encryption_rejects_wrong_key() {
        let key_a = [0x42u8; 32];
        let key_b = [0x99u8; 32];
        let encrypted = encrypt_with_key(&key_a, "secret").unwrap();
        assert!(decrypt_with_key(&key_b, &encrypted).is_err());
    }

    #[test]
    fn is_mutating_query_detects_mutations() {
        assert!(is_mutating_query("INSERT INTO users (name) VALUES ('foo')"));
        assert!(is_mutating_query("UPDATE users SET name = 'bar'"));
        assert!(is_mutating_query("DELETE FROM users"));
        assert!(is_mutating_query("CREATE TABLE foo (id INT)"));
        assert!(is_mutating_query("DROP TABLE users"));
        assert!(is_mutating_query("ALTER TABLE users ADD COLUMN x INT"));
        assert!(is_mutating_query("TRUNCATE TABLE users"));
        assert!(is_mutating_query("REPLACE INTO users (id) VALUES (1)"));
    }

    #[test]
    fn is_mutating_query_rejects_reads() {
        assert!(!is_mutating_query("SELECT * FROM users"));
        assert!(!is_mutating_query("SHOW TABLES"));
        assert!(!is_mutating_query("DESCRIBE users"));
        assert!(!is_mutating_query("EXPLAIN SELECT 1"));
        assert!(!is_mutating_query("WITH cte AS (SELECT 1) SELECT * FROM cte"));
    }

    #[test]
    fn has_where_clause_detects_where() {
        assert!(has_where_clause("SELECT * FROM users WHERE id = 1"));
        assert!(has_where_clause("UPDATE users SET name = 'x' WHERE id = 1"));
        assert!(has_where_clause("DELETE FROM users WHERE id = 1"));
        assert!(!has_where_clause("SELECT * FROM users"));
        assert!(!has_where_clause("UPDATE users SET name = 'x'"));
        assert!(!has_where_clause("DELETE FROM users"));
        assert!(!has_where_clause("INSERT INTO users (name) VALUES ('foo')"));
    }

    #[test]
    fn is_mutating_query_ignores_keywords_in_literals() {
        assert!(!is_mutating_query("SELECT 'DROP TABLE users' AS warning"));
        assert!(!is_mutating_query("SELECT `DELETE` FROM t"));
    }
}
