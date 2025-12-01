import { CONFIG } from '../config.js';

/**
 * Development logging utilities
 * Only logs when CONFIG.DEV_MODE is true
 */

/**
 * Log a message in development mode
 * @param {...any} args - Arguments to log
 */
export function devLog(...args) {
  if (CONFIG.DEV_MODE) {
    console.log(...args);
  }
}

/**
 * Log a warning in development mode
 * @param {...any} args - Arguments to log
 */
export function devWarn(...args) {
  if (CONFIG.DEV_MODE) {
    console.warn(...args);
  }
}

/**
 * Log an error in development mode
 * @param {...any} args - Arguments to log
 */
export function devError(...args) {
  if (CONFIG.DEV_MODE) {
    console.error(...args);
  }
}
