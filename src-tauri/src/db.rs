use anyhow::Result;
use r2d2::{Pool, PooledConnection};
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::params;

pub struct Db {
    pool: Pool<SqliteConnectionManager>,
}

impl Db {
    pub fn new(db_path: &str) -> Result<Self> {
        let manager = SqliteConnectionManager::file(db_path).with_flags(
            rusqlite::OpenFlags::SQLITE_OPEN_READ_WRITE | rusqlite::OpenFlags::SQLITE_OPEN_CREATE,
        );

        let pool = Pool::new(manager)?;
        let db = Db { pool };

        // Initialize tables in a single database
        {
            let conn = db.pool.get()?; // This is a PooledConnection<SqliteConnectionManager>
            conn.execute_batch(
                "
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS devices (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    ip TEXT NOT NULL,
                    last_seen INTEGER
                );
                CREATE TABLE IF NOT EXISTS tunnels (
                    id INTEGER PRIMARY KEY,
                    device_id INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    last_checked INTEGER,
                    FOREIGN KEY(device_id) REFERENCES devices(id)
                );
                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY,
                    device_id INTEGER NOT NULL,
                    cpu REAL,
                    mem REAL,
                    timestamp INTEGER,
                    FOREIGN KEY(device_id) REFERENCES devices(id)
                );
                CREATE TABLE IF NOT EXISTS command_logs (
                    id INTEGER PRIMARY KEY,
                    device_id INTEGER NOT NULL,
                    command TEXT NOT NULL,
                    output TEXT,
                    timestamp INTEGER,
                    FOREIGN KEY(device_id) REFERENCES devices(id)
                );
                CREATE INDEX IF NOT EXISTS idx_metrics_device_time ON metrics(device_id, timestamp);
                CREATE INDEX IF NOT EXISTS idx_tunnels_device_status ON tunnels(device_id, status);
                ",
            )?;
        }

        Ok(db)
    }

    /// Get a pooled connection for DB operations
    fn get_conn(&self) -> Result<PooledConnection<SqliteConnectionManager>> {
        Ok(self.pool.get()?)
    }

    pub fn insert_device(&self, name: &str, ip: &str, last_seen: Option<i64>) -> Result<usize> {
        let conn = self.get_conn()?;
        conn.execute(
            "INSERT INTO devices (name, ip, last_seen) VALUES (?1, ?2, ?3)",
            params![name, ip, last_seen],
        )
        .map_err(Into::into)
    }

    pub fn delete_device(&self, id: i32) -> Result<usize> {
        let conn = self.get_conn()?;
        conn.execute("DELETE FROM devices WHERE id = ?1", params![id])
            .map_err(Into::into)
    }

    pub fn get_device(&self, id: i32) -> Result<Option<Device>> {
        let conn = self.get_conn()?;
        let mut stmt = conn.prepare("SELECT id, name, ip, last_seen FROM devices WHERE id = ?1")?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Device {
                id: row.get(0)?,
                name: row.get(1)?,
                ip: row.get(2)?,
                last_seen: row.get(3)?,
            }))
        } else {
            Ok(None)
        }
    }

    // Tunnels
    pub fn insert_tunnel(
        &self,
        device_id: i32,
        status: &str,
        last_checked: Option<i64>,
    ) -> Result<usize> {
        let conn = self.get_conn()?;
        conn.execute(
            "INSERT INTO tunnels (device_id, status, last_checked) VALUES (?1, ?2, ?3)",
            params![device_id, status, last_checked],
        )
        .map_err(Into::into)
    }

    pub fn delete_tunnel(&self, id: i32) -> Result<usize> {
        let conn = self.get_conn()?;
        conn.execute("DELETE FROM tunnels WHERE id = ?1", params![id])
            .map_err(Into::into)
    }

    pub fn get_tunnel(&self, id: i32) -> Result<Option<Tunnel>> {
        let conn = self.get_conn()?;
        let mut stmt =
            conn.prepare("SELECT id, device_id, status, last_checked FROM tunnels WHERE id = ?1")?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Tunnel {
                id: row.get(0)?,
                device_id: row.get(1)?,
                status: row.get(2)?,
                last_checked: row.get(3)?,
            }))
        } else {
            Ok(None)
        }
    }

    // Metrics
    pub fn insert_metric(
        &self,
        device_id: i32,
        cpu: f64,
        mem: f64,
        timestamp: i64,
    ) -> Result<usize> {
        let conn = self.get_conn()?;
        conn.execute(
            "INSERT INTO metrics (device_id, cpu, mem, timestamp) VALUES (?1, ?2, ?3, ?4)",
            params![device_id, cpu, mem, timestamp],
        )
        .map_err(Into::into)
    }

    pub fn delete_metric(&self, id: i32) -> Result<usize> {
        let conn = self.get_conn()?;
        conn.execute("DELETE FROM metrics WHERE id = ?1", params![id])
            .map_err(Into::into)
    }

    pub fn get_metric(&self, id: i32) -> Result<Option<Metric>> {
        let conn = self.get_conn()?;
        let mut stmt =
            conn.prepare("SELECT id, device_id, cpu, mem, timestamp FROM metrics WHERE id = ?1")?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Metric {
                id: row.get(0)?,
                device_id: row.get(1)?,
                cpu: row.get(2)?,
                mem: row.get(3)?,
                timestamp: row.get(4)?,
            }))
        } else {
            Ok(None)
        }
    }

    // Command Logs
    pub fn insert_command_log(
        &self,
        device_id: i32,
        command: &str,
        output: Option<&str>,
        timestamp: i64,
    ) -> Result<usize> {
        let conn = self.get_conn()?;
        conn.execute(
            "INSERT INTO command_logs (device_id, command, output, timestamp) VALUES (?1, ?2, ?3, ?4)",
            params![device_id, command, output, timestamp],
        ).map_err(Into::into)
    }

    pub fn delete_command_log(&self, id: i32) -> Result<usize> {
        let conn = self.get_conn()?;
        conn.execute("DELETE FROM command_logs WHERE id = ?1", params![id])
            .map_err(Into::into)
    }

    pub fn get_command_log(&self, id: i32) -> Result<Option<CommandLog>> {
        let conn = self.get_conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, device_id, command, output, timestamp FROM command_logs WHERE id = ?1",
        )?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(CommandLog {
                id: row.get(0)?,
                device_id: row.get(1)?,
                command: row.get(2)?,
                output: row.get(3)?,
                timestamp: row.get(4)?,
            }))
        } else {
            Ok(None)
        }
    }
}

pub struct Device {
    pub id: i32,
    pub name: String,
    pub ip: String,
    pub last_seen: Option<i64>,
}
pub struct Tunnel {
    pub id: i32,
    pub device_id: i32,
    pub status: String,
    pub last_checked: Option<i64>,
}
pub struct Metric {
    pub id: i32,
    pub device_id: i32,
    pub cpu: f64,
    pub mem: f64,
    pub timestamp: i64,
}

pub struct CommandLog {
    pub id: i32,
    pub device_id: i32,
    pub command: String,
    pub output: Option<String>,
    pub timestamp: i64,
}
