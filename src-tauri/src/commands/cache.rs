use crate::commands::db::{QueryHistoryItem, SavedQuery};
use std::path::PathBuf;
use std::path::Path;
use std::time::SystemTime;
use tauri::{AppHandle, Manager};

pub struct HistoryCacheState {
    pub items: Vec<QueryHistoryItem>,
    pub loaded: bool,
}

pub struct SavedQueriesCacheState {
    pub items: Vec<SavedQuery>,
    pub dir_mtime: Option<SystemTime>,
}

pub fn history_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    path.push("query_history.json");
    Ok(path)
}

pub fn dir_mtime(path: &Path) -> Option<SystemTime> {
    std::fs::metadata(path).ok()?.modified().ok()
}

pub fn load_history_from_disk(app: &AppHandle) -> Vec<QueryHistoryItem> {
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

pub fn save_history_to_disk(
    app: &AppHandle,
    history: &[QueryHistoryItem],
) -> Result<(), String> {
    let path = history_path(app)?;
    let content = serde_json::to_string(history).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}
