use crate::command::AppState;
use log::{error, info};
use openssh::{KnownHosts, Session, SessionBuilder};
use serde::Serialize;
use tauri::State;

/// SSH connection configuration options
#[derive(Debug, Clone, serde::Deserialize)]
pub struct SshConfig {
    pub username: Option<String>,
    pub port: Option<u16>,
    pub strict_host_key_checking: Option<bool>,
    pub connect_timeout: Option<u64>,
}

impl Default for SshConfig {
    fn default() -> Self {
        Self {
            username: None,
            port: Some(22),
            strict_host_key_checking: Some(true),
            connect_timeout: Some(30),
        }
    }
}

/// Connect to a remote host with customizable SSH options
pub async fn new_connection(
    state: State<'_, AppState>,
    hostname: String,
    ip: String,
) -> Result<(), String> {
    new_connection_with_config(state, hostname, ip, SshConfig::default()).await
}

/// Connect to a remote host with full SSH configuration
pub async fn new_connection_with_config(
    state: State<'_, AppState>,
    hostname: String,
    ip: String,
    config: SshConfig,
) -> Result<(), String> {
    let username = config.username.unwrap_or_else(|| "user".to_string());
    let port = config.port.unwrap_or(22);
    let strict_checking = config.strict_host_key_checking.unwrap_or(true);

    // Determine known_hosts policy
    let known_hosts = if strict_checking {
        KnownHosts::Strict
    } else {
        KnownHosts::Accept
    };

    // Build connection string with optional port
    let connection_string = if port == 22 {
        format!("{}@{}", username, ip)
    } else {
        format!("{}@{}:{}", username, ip, port)
    };

    info!(
        "Attempting SSH connection to {} ({}@{}:{}) with strict_checking={}",
        hostname, username, ip, port, strict_checking
    );

    // Create session builder with timeout if specified
    let mut builder = SessionBuilder::default();
    if let Some(timeout) = config.connect_timeout {
        builder.connect_timeout(std::time::Duration::from_secs(timeout));
    }
    builder.known_hosts_check(known_hosts);

    match builder.connect(&connection_string).await {
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

/// Test SSH connection without adding to database
pub async fn test_connection(
    hostname: String,
    ip: String,
    config: SshConfig,
) -> Result<String, String> {
    let username = config.username.unwrap_or_else(|| "user".to_string());
    let port = config.port.unwrap_or(22);
    let strict_checking = config.strict_host_key_checking.unwrap_or(true);

    let known_hosts = if strict_checking {
        KnownHosts::Strict
    } else {
        KnownHosts::Accept
    };

    let connection_string = if port == 22 {
        format!("{}@{}", username, ip)
    } else {
        format!("{}@{}:{}", username, ip, port)
    };

    info!(
        "Testing SSH connection to {} ({})",
        hostname, connection_string
    );

    let mut builder = SessionBuilder::default();
    if let Some(timeout) = config.connect_timeout {
        builder.connect_timeout(std::time::Duration::from_secs(timeout));
    }
    builder.known_hosts_check(known_hosts);

    match builder.connect(&connection_string).await {
        Ok(_session) => {
            info!("Test connection successful to {}", hostname);
            Ok(format!(
                "Successfully connected to {}@{}:{}",
                username, ip, port
            ))
        }
        Err(e) => {
            error!("Test connection failed to {}: {}", hostname, e);
            Err(format!("Connection test failed: {}", e))
        }
    }
}

/// Real-time system metrics from remote device
#[derive(Debug, Clone, Serialize)]
pub struct SystemMetrics {
    pub cpu_usage: f64,
    pub memory_used_mb: f64,
    pub memory_total_mb: f64,
    pub memory_percent: f64,
    pub disk_used_gb: f64,
    pub disk_total_gb: f64,
    pub disk_percent: f64,
    pub uptime_seconds: u64,
    pub load_average: String,
    pub timestamp: i64,
}

/// Establish SSH session for metrics streaming
async fn create_session(ip: &str, config: &SshConfig) -> Result<Session, String> {
    let username = config.username.as_deref().unwrap_or("user");
    let port = config.port.unwrap_or(22);
    let strict_checking = config.strict_host_key_checking.unwrap_or(true);

    let known_hosts = if strict_checking {
        KnownHosts::Strict
    } else {
        KnownHosts::Accept
    };

    let connection_string = if port == 22 {
        format!("{}@{}", username, ip)
    } else {
        format!("{}@{}:{}", username, ip, port)
    };

    let mut builder = SessionBuilder::default();
    if let Some(timeout) = config.connect_timeout {
        builder.connect_timeout(std::time::Duration::from_secs(timeout));
    }
    builder.known_hosts_check(known_hosts);

    builder
        .connect(&connection_string)
        .await
        .map_err(|e| format!("Failed to connect: {}", e))
}

/// Fetch real-time system metrics from remote device
pub async fn get_system_metrics(ip: String, config: SshConfig) -> Result<SystemMetrics, String> {
    info!(
        "Creating SSH session to {} with username {:?}",
        ip, config.username
    );
    let session = create_session(&ip, &config).await?;
    info!("SSH session created successfully");

    // Command to gather system metrics in a single SSH call
    let command = r#"
        # CPU usage (average over 1 second)
        cpu=$(top -bn2 -d 0.5 | grep "Cpu(s)" | tail -1 | awk '{print 100 - $8}')

        # Memory info
        mem=$(free -m | awk 'NR==2{printf "%.2f %.2f %.2f", $3, $2, $3*100/$2}')

        # Disk info (root partition)
        disk=$(df -BG / | awk 'NR==2{gsub(/G/, "", $3); gsub(/G/, "", $2); printf "%.2f %.2f %.2f", $3, $2, $3*100/$2}')

        # Uptime in seconds
        uptime=$(awk '{print int($1)}' /proc/uptime)

        # Load average
        loadavg=$(cat /proc/loadavg | awk '{print $1","$2","$3}')

        # Output in parseable format
        echo "$cpu|$mem|$disk|$uptime|$loadavg"
    "#;

    info!("Executing metrics command via SSH");
    let output = session
        .command("bash")
        .arg("-c")
        .arg(command)
        .output()
        .await
        .map_err(|e| {
            error!("Failed to execute metrics command: {}", e);
            format!("Failed to execute metrics command: {}", e)
        })?;

    info!("Command executed, status: {:?}", output.status);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("Metrics command failed with stderr: {}", stderr);
        return Err(format!("Metrics command failed: {}", stderr));
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    info!("Command output: {}", output_str);
    let parts: Vec<&str> = output_str.trim().split('|').collect();

    if parts.len() != 5 {
        return Err(format!("Unexpected metrics output format: {}", output_str));
    }

    // Parse CPU
    let cpu_usage = parts[0].trim().parse::<f64>().unwrap_or(0.0);

    // Parse memory
    let mem_parts: Vec<&str> = parts[1].split_whitespace().collect();
    let memory_used_mb = mem_parts.get(0).and_then(|s| s.parse().ok()).unwrap_or(0.0);
    let memory_total_mb = mem_parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(1.0);
    let memory_percent = mem_parts.get(2).and_then(|s| s.parse().ok()).unwrap_or(0.0);

    // Parse disk
    let disk_parts: Vec<&str> = parts[2].split_whitespace().collect();
    let disk_used_gb = disk_parts
        .get(0)
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.0);
    let disk_total_gb = disk_parts
        .get(1)
        .and_then(|s| s.parse().ok())
        .unwrap_or(1.0);
    let disk_percent = disk_parts
        .get(2)
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.0);

    // Parse uptime
    let uptime_seconds = parts[3].trim().parse::<u64>().unwrap_or(0);

    // Load average
    let load_average = parts[4].trim().to_string();

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    Ok(SystemMetrics {
        cpu_usage,
        memory_used_mb,
        memory_total_mb,
        memory_percent,
        disk_used_gb,
        disk_total_gb,
        disk_percent,
        uptime_seconds,
        load_average,
        timestamp,
    })
}
