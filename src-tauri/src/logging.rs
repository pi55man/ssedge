use simplelog::{Config, LevelFilter, WriteLogger};
use std::fs::{self, OpenOptions};
use std::path::PathBuf;
use std::sync::Mutex;

static LOG_FILE: Mutex<Option<PathBuf>> = Mutex::new(None);

pub fn init_logger() -> Result<(), String> {
    let home = std::env::var("HOME").map_err(|_| "Failed to get HOME directory".to_string())?;

    let log_dir = PathBuf::from(home).join(".ssedge");
    fs::create_dir_all(&log_dir).map_err(|e| format!("Failed to create log directory: {}", e))?;

    let log_file_path = log_dir.join("app.log");

    let file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file_path)
        .map_err(|e| format!("Failed to open log file: {}", e))?;

    WriteLogger::init(LevelFilter::Info, Config::default(), file)
        .map_err(|e| format!("Failed to initialize logger: {}", e))?;

    *LOG_FILE.lock().unwrap() = Some(log_file_path);
    Ok(())
}

pub fn get_log_file_path() -> Option<PathBuf> {
    LOG_FILE.lock().unwrap().clone()
}
