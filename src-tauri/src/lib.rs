pub mod command;
pub mod db;
pub mod logging;
pub mod ssh;

use command::AppState;
use db::Db;
use std::sync::Mutex;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let home = std::env::var("HOME").expect("Failed to get HOME directory");
    let db_path = format!("{}/.ssedge/app.db", home);
    std::fs::create_dir_all(format!("{}/.ssedge", home))
        .expect("Failed to create .ssedge directory");

    // Initialize logger
    logging::init_logger().expect("Failed to initialize logger");

    let db = Db::new(&db_path).expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState { db: Mutex::new(db) })
        .invoke_handler(tauri::generate_handler![
            command::get_devices,
            command::add_device,
            command::delete_device,
            command::get_log_path,
            command::connect_and_add_device,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
