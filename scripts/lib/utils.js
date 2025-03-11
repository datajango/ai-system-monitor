const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Setup output directories for comparison results
 * @param {Object} config - Configuration object
 */
function setupOutputDirectories(config) {
    [
        config.OUTPUT_DIR,
        config.API_SNAPSHOTS_DIR,
        config.FS_SNAPSHOTS_DIR,
        path.join(config.OUTPUT_DIR, 'diffs'),
        config.TEMPLATES_DIR  // Make sure to create the templates directory
    ].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}
/**
 * Create logger utility with colorized output
 * @returns {Object} Logger object
 */
function createLogger() {
    return {
        log: (message) => console.log(message),
        info: (message) => console.log(chalk.blue(`[INFO] ${message}`)),
        success: (message) => console.log(chalk.green(`[SUCCESS] ${message}`)),
        warning: (message) => console.log(chalk.yellow(`[WARNING] ${message}`)),
        error: (message) => console.log(chalk.red(`[ERROR] ${message}`)),
        result: (message) => console.log(chalk.cyan(`[RESULT] ${message}`))
    };
}

module.exports = { setupOutputDirectories, createLogger };