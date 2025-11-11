use crate::db::Db;
use crate::logging;
use log::{error, info, warn};

pub fn init_logger() -> Result<(), String> {
    logging::init_logger()
}

#[tauri::command]
pub fn init_db(path: String) -> Result<(), String> {
    info!("Initializing database at {}", path);
    Db::new(path.as_str())
        .map_err(|e| {
            error!("Failed to initialize database at {}: {}", path, e);
        })
        .ok();
    Ok(())
}
