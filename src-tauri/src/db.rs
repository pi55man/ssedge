#![allow(unused_imports)]
#![allow(dead_code)]
#![allow(unused_must_use)]

use rusqlite::{params, Connection, Result};

pub struct App {
    pub config_path: String,
}


#[derive(serde::Serialize, serde::Deserialize)]
struct Device {
    pub id: i32,
    pub device_id: i32,
    pub name: String,
    pub public_key: String,
    pub status: String,
    pub last_seen: String,
    pub ip_address: String,
    pub notes: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Tunnel {
    pub id: i32,
    pub device_id: i32,
    pub assigned_port: i32,
    pub bind_address: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    pub ended_at: String,
    pub bytes_in: i64,
    pub bytes_out: i64,
    pub latency_ms: i32,
    pub error_msg: String,
}

impl App {
    pub fn new() -> Self {
       if let Some(_) = std::fs::create_dir_all("/.ssedge/").ok() {
           let config_path = String::from("/.ssedge/");
        App { config_path: config_path, }        
       } else {
            panic!("Failed to create config directory");
        }
    }

    pub fn create_device_table(&self) -> Result<(), String> {
        let config_dir = format!("{}/devices.db", self.config_path);

        let conn = Connection::open(config_dir).unwrap();
        conn.execute(
            "CREATE TABLE IF NOT EXISTS devices (
                device_id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                public_key TEXT NOT NULL,
                status TEXT NOT NULL,
                last_seen TEXT NOT NULL,
                ip_address TEXT NOT NULL,
                notes TEXT
            )",
            [],
        ).map_err(|e| {
            format!("Failed to create devices table: {}", e)
        });
        Ok(())

    }
    
    pub fn create_tunnel_table(&self) -> Result<(), String> {
        let config_dir = format!("{}/tunnels.db", self.config_path);

        let conn = Connection::open(config_dir).unwrap();
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tunnels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL,
                assigned_port INTEGER NOT NULL,
                bind_address TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                ended_at TEXT,
                bytes_in INTEGER NOT NULL,
                bytes_out INTEGER NOT NULL,
                latency_ms INTEGER NOT NULL,
                error_msg TEXT,
                FOREIGN KEY(device_id) REFERENCES devices(device_id)
            )",
            [],
        ).map_err(|e| {
            format!("Failed to create tunnels table: {}", e)
        });
        Ok(())

    }
}



