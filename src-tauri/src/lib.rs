mod commands;

use std::sync::Arc;
use tokio::sync::Mutex;
use mysql_async::Pool;

pub struct AppState {
    pub pool: Arc<Mutex<Option<Pool>>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            pool: Arc::new(Mutex::new(None)),
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::run_query,
            commands::connect,
            commands::disconnect,
            commands::test_connection,
            commands::fetch_schema,
            commands::fetch_databases,
            commands::get_history,
            commands::save_query,
            commands::export_csv,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
