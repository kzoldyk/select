mod commands;

use mysql_async::Pool;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AppState {
    pub pools: Arc<Mutex<HashMap<String, Pool>>>,
    pub active_connection_id: Arc<Mutex<Option<String>>>,
    pub connection_urls: Arc<Mutex<HashMap<String, String>>>,
    pub thread_ids: Arc<Mutex<HashMap<String, u32>>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            pools: Arc::new(Mutex::new(HashMap::new())),
            active_connection_id: Arc::new(Mutex::new(None)),
            connection_urls: Arc::new(Mutex::new(HashMap::new())),
            thread_ids: Arc::new(Mutex::new(HashMap::new())),
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::run_query,
            commands::run_multi_query,
            commands::run_write_query,
            commands::run_query_paged,
            commands::update_rows,
            commands::cancel_query,
            commands::refresh_thread_id,
            commands::connect,
            commands::disconnect,
            commands::test_connection,
            commands::change_database,
            commands::set_autocommit,
            commands::fetch_schema_tables,
            commands::fetch_schema,
            commands::fetch_table_details,
            commands::fetch_databases,
            commands::get_history,
            commands::save_query,
            commands::load_queries,
            commands::rename_query,
            commands::delete_query,
            commands::export_csv,
            commands::kill_session,
            commands::encrypt_password,
            commands::decrypt_password,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
