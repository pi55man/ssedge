use crate::db::{Db, Device};
use log::{error, info};
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub db: Mutex<Db>,
}

#[tauri::command]
pub fn get_devices(state: State<'_, AppState>) -> Result<Vec<Device>, String> {
    info!("Fetching all devices");
    let db = state.db.lock().map_err(|e| {
        let err_msg = format!("Failed to lock db: {}", e);
        error!("{}", err_msg);
        err_msg
    })?;

    db.get_all_devices()
        .map_err(|e| {
            let err_msg = format!("Failed to get devices: {}", e);
            error!("{}", err_msg);
            err_msg
        })
        .map(|devices| {
            info!("Successfully fetched {} devices", devices.len());
            devices
        })
}

#[tauri::command]
pub async fn add_device(
    state: State<'_, AppState>,
    name: String,
    ip: String,
) -> Result<(), String> {
    info!("Adding device: name={}, ip={}", name, ip);
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.insert_device(&name, &ip, None)
        .map_err(|e| e.to_string())?;
    info!("Device added successfully: {}", name);
    Ok(())
}

#[tauri::command]
pub async fn delete_device(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    info!("Deleting device with id: {}", id);
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_device(id).map_err(|e| e.to_string())?;
    info!("Device deleted successfully: {}", id);
    Ok(())
}

#[tauri::command]
pub fn get_log_path() -> String {
    crate::logging::get_log_file_path_string()
}

#[tauri::command]
pub async fn connect_and_add_device(
    state: State<'_, AppState>,
    hostname: String,
    ip: String,
) -> Result<String, String> {
    info!(
        "Starting connect_and_add_device for hostname={}, ip={}",
        hostname, ip
    );
    match crate::ssh::new_connection(state, hostname.clone(), ip).await {
        Ok(_) => {
            info!("Successfully connected and added device: {}", hostname);
            Ok("Connected successfully".to_string())
        }
        Err(e) => {
            error!("Failed to connect to device {}: {}", hostname, e);
            Err(format!("Connection failed: {}", e))
        }
    }
}
