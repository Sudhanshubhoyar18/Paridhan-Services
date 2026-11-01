import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.resolve(__dirname, '../../data/logs');
const LOG_FILE = path.join(LOG_DIR, 'system.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create log directory:', err);
  }
}

// In-memory circular buffer for recent log items
const MAX_MEMORY_LOGS = 100;
const memoryLogs = [];

function appendLog(level, message, meta = null) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    message: typeof message === 'object' ? JSON.stringify(message) : String(message),
    meta: meta ? (meta.stack ? { message: meta.message, stack: meta.stack } : meta) : null
  };

  // Add to memory
  memoryLogs.unshift(entry);
  if (memoryLogs.length > MAX_MEMORY_LOGS) {
    memoryLogs.pop();
  }

  // Format line for file
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${entry.message}${entry.meta ? ' ' + JSON.stringify(entry.meta) : ''}\n`;

  try {
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
  } catch (err) {
    console.error('Failed writing to log file:', err.message);
  }
}

export const logger = {
  info: (message, meta) => appendLog('info', message, meta),
  warn: (message, meta) => appendLog('warn', message, meta),
  error: (message, meta) => {
    console.error(`[ERROR] ${message}`, meta || '');
    appendLog('error', message, meta);
  },
  getRecentLogs: (limit = 50) => memoryLogs.slice(0, limit),
  getLogFilePath: () => LOG_FILE,
  clearLogs: () => {
    memoryLogs.length = 0;
    try {
      if (fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, `[${new Date().toISOString()}] [INFO] Log file cleared by administrator.\n`, 'utf8');
      }
      return true;
    } catch (_) {
      return false;
    }
  }
};

export default logger;

