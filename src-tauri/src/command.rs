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

#[tauri::command]
pub async fn connect_and_add_device_with_config(
    state: State<'_, AppState>,
    hostname: String,
    ip: String,
    username: Option<String>,
    port: Option<u16>,
    strict_host_key_checking: Option<bool>,
    connect_timeout: Option<u64>,
) -> Result<String, String> {
    info!(
        "Starting connect_and_add_device_with_config for hostname={}, ip={}, username={:?}, port={:?}",
        hostname, ip, username, port
    );

    let config = crate::ssh::SshConfig {
        username,
        port,
        strict_host_key_checking,
        connect_timeout,
    };

    match crate::ssh::new_connection_with_config(state, hostname.clone(), ip, config).await {
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

#[tauri::command]
pub async fn test_ssh_connection(
    hostname: String,
    ip: String,
    username: Option<String>,
    port: Option<u16>,
    strict_host_key_checking: Option<bool>,
    connect_timeout: Option<u64>,
) -> Result<String, String> {
    info!("Testing SSH connection to hostname={}, ip={}", hostname, ip);

    let config = crate::ssh::SshConfig {
        username,
        port,
        strict_host_key_checking,
        connect_timeout,
    };

    crate::ssh::test_connection(hostname, ip, config).await
}

#[tauri::command]
pub async fn get_device_metrics(
    ip: String,
    username: Option<String>,
    port: Option<u16>,
    strict_host_key_checking: Option<bool>,
    connect_timeout: Option<u64>,
) -> Result<crate::ssh::SystemMetrics, String> {
    info!("Fetching system metrics for device at ip={}", ip);

    let config = crate::ssh::SshConfig {
        username,
        port,
        strict_host_key_checking,
        connect_timeout,
    };

    crate::ssh::get_system_metrics(ip, config).await
}
