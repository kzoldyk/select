use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::State;
use crate::AppState;
use mysql_async::prelude::*;
use mysql_async::{Pool, Opts};

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
pub struct Column {
    pub name: String,
    pub r#type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<Column>,
    pub rows: Vec<serde_json::Value>,
    pub duration_ms: u64,
    pub row_count: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryHistoryItem {
    pub id: String,
    pub sql: String,
    pub executed_at: String,
    pub duration_ms: u64,
    pub row_count: u64,
    pub error: Option<String>,
}

// ── Tauri Commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn run_query(sql: String, state: State<'_, AppState>) -> Result<QueryResult, String> {
    let start = std::time::Instant::now();
    let pool_guard = state.pool.lock().await;
    let pool = pool_guard.as_ref().ok_or("No active connection")?;
    
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    let mysql_rows: Vec<mysql_async::Row> = conn.query(&sql).await.map_err(|e| e.to_string())?;
    
    let mut columns = Vec::new();
    let mut json_rows = Vec::new();

    if let Some(first_row) = mysql_rows.first() {
        for col in first_row.columns().as_ref() {
            columns.push(Column {
                name: col.name_str().into_owned(),
                r#type: "text".into(), // Maps all dynamically
            });
        }
    }

    for row in mysql_rows {
        let mut map = serde_json::Map::new();
        for col in row.columns().as_ref() {
            let col_name = col.name_str().into_owned();
            let val = row.get_opt::<mysql_async::Value, _>(col_name.as_str());
            let json_val = match val {
                Some(Ok(v)) => {
                    match v {
                        mysql_async::Value::NULL => Value::Null,
                        mysql_async::Value::Bytes(b) => Value::String(String::from_utf8_lossy(&b).to_string()),
                        mysql_async::Value::Int(i) => json!(i),
                        mysql_async::Value::UInt(u) => json!(u),
                        mysql_async::Value::Float(f) => json!(f),
                        mysql_async::Value::Double(d) => json!(d),
                        mysql_async::Value::Date(y, m, d, h, mi, s, micro) => {
                            Value::String(format!("{:04}-{:02}-{:02} {:02}:{:02}:{:02}.{:06}", y, m, d, h, mi, s, micro))
                        },
                        mysql_async::Value::Time(neg, d, h, m, s, micro) => {
                            let sign = if neg { "-" } else { "" };
                            Value::String(format!("{}{:02}:{:02}:{:02}.{:06}", sign, d*24 + h as u32, m, s, micro))
                        }
                    }
                },
                _ => Value::Null,
            };
            map.insert(col_name, json_val);
        }
        json_rows.push(Value::Object(map));
    }

    let duration = start.elapsed().as_millis() as u64;

    Ok(QueryResult {
        row_count: json_rows.len() as u64,
        columns,
        rows: json_rows,
        duration_ms: duration,
    })
}

#[tauri::command]
pub async fn connect(config: ConnectionConfig, state: State<'_, AppState>) -> Result<String, String> {
    let url = format!("mysql://{}:{}@{}:{}/{}", config.username, config.password, config.host, config.port, config.database);
    let opts = Opts::from_url(&url).map_err(|e| e.to_string())?;
    let pool = Pool::new(opts);
    
    // Test connection
    let conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    drop(conn);

    *state.pool.lock().await = Some(pool);
    Ok(format!("conn-{}", config.name))
}

#[tauri::command]
pub async fn disconnect(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let _ = id;
    *state.pool.lock().await = None;
    Ok(())
}

#[tauri::command]
pub async fn test_connection(config: ConnectionConfig) -> Result<u64, String> {
    let start = std::time::Instant::now();
    let url = format!("mysql://{}:{}@{}:{}/{}", config.username, config.password, config.host, config.port, config.database);
    let opts = Opts::from_url(&url).map_err(|e| e.to_string())?;
    let pool = Pool::new(opts);
    let conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    drop(conn);
    Ok(start.elapsed().as_millis() as u64)
}

#[tauri::command]
pub async fn fetch_databases(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let pool_guard = state.pool.lock().await;
    let pool = pool_guard.as_ref().ok_or("No active connection")?;
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    let dbs: Vec<String> = conn.query("SHOW DATABASES").await.map_err(|e| e.to_string())?;
    Ok(dbs)
}

#[tauri::command]
pub async fn fetch_schema(id: String, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let _ = id;
    let pool_guard = state.pool.lock().await;
    let pool = pool_guard.as_ref().ok_or("No active connection")?;
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    let tables: Vec<String> = conn.query("SHOW TABLES").await.map_err(|e| e.to_string())?;
    
    Ok(serde_json::json!({
        "tables": tables,
        "views":  [],
        "functions": [],
    }))
}

#[tauri::command]
pub async fn get_history() -> Result<Vec<QueryHistoryItem>, String> {
    Ok(vec![
        QueryHistoryItem {
            id: "h1".into(),
            sql: "SELECT * FROM users LIMIT 100".into(),
            executed_at: "2024-01-15T10:30:00Z".into(),
            duration_ms: 42,
            row_count: 100,
            error: None,
        },
    ])
}

#[tauri::command]
pub async fn save_query(name: String, sql: String) -> Result<(), String> {
    let _ = (name, sql);
    Ok(())
}

#[tauri::command]
pub async fn export_csv(result: QueryResult) -> Result<String, String> {
    let header = result.columns.iter().map(|c| c.name.clone()).collect::<Vec<_>>().join(",");
    let rows: Vec<String> = result.rows.iter().map(|row| {
        result.columns.iter().map(|col| {
            match row.get(&col.name) {
                Some(v) => v.to_string().trim_matches('"').to_string(),
                None => String::new(),
            }
        }).collect::<Vec<_>>().join(",")
    }).collect();
    Ok(format!("{}\n{}", header, rows.join("\n")))
}
