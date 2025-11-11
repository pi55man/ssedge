import { invoke } from "@tauri-apps/api/core";
//import { fs } from "@tauri-apps/api";

let logFilePath: string | null = null;

async function getLogPath(): Promise<string> {
  if (!logFilePath) {
    logFilePath = await invoke<string>("get_log_path");
  }
  return logFilePath;
}

async function writeLog(level: string, message: string) {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} [${level}] [Frontend] ${message}\n`;
    const path = await getLogPath();
    
    // Append to log file
    //await fs.writeTextFile(path, logMessage, { append: true });
  } catch (error) {
    console.error("Failed to write to log file:", error);
  }
}

export const logger = {
  info: (message: string) => {
    console.info(message);
    writeLog("INFO", message);
  },
  warn: (message: string) => {
    console.warn(message);
    writeLog("WARN", message);
  },
  error: (message: string) => {
    console.error(message);
    writeLog("ERROR", message);
  },
  debug: (message: string) => {
    console.debug(message);
    writeLog("DEBUG", message);
  },
};
