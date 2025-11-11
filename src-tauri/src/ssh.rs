use crate::command::AppState;
use log::{error, info};
use openssh::{KnownHosts, Session};
use tauri::State;

#[tauri::command]
pub async fn new_connection(
    state: State<'_, AppState>,
    hostname: String,
    ip: String,
) -> Result<(), String> {
    let known_hosts = KnownHosts::Strict;
    match Session::connect(format!("{}@{}", "user", ip), known_hosts).await {
        Ok(_session) => {
            info!("Successfully connected to {} at IP {}", hostname, ip);

            // Add device to database after successful connection
            let db = state.db.lock().map_err(|e| e.to_string())?;
            db.insert_device(&hostname, &ip, None)
                .map_err(|e| e.to_string())?;
            info!("Device added successfully: {}", hostname);

            Ok(())
        }
        Err(e) => {
            error!("Failed to connect to {}: {}", hostname, e);
            Err(format!("Failed to connect: {}", e))
        }
    }
}
