const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { setupOutputDirectories, createLogger } = require('./lib/utils');
const { getFileSystemSnapshots } = require('./lib/fs-snapshots');
const { getApiSnapshots } = require('./lib/api-snapshots');
const { compareSnapshots } = require('./lib/comparison');
const { generateReport } = require('./lib/reporting');

// Configuration
const CONFIG = {
    SNAPSHOTS_DIR: 'D:/Snapshots',
    API_BASE_URL: 'http://localhost:3000/api/v1',
    OUTPUT_DIR: './comparison-results',
    API_SNAPSHOTS_DIR: './comparison-results/api-snapshots',
    FS_SNAPSHOTS_DIR: './comparison-results/fs-snapshots',
    TEMPLATES_DIR: './templates'
};

// Main function
async function main() {
    const logger = createLogger();

    try {
        logger.log(chalk.bold('\n===== SNAPSHOT COMPARISON TOOL =====\n'));

        // Setup directories
        setupOutputDirectories(CONFIG);

        // Get snapshots from filesystem
        const fsSnapshots = await getFileSystemSnapshots(CONFIG, logger);

        // Get snapshots from API
        const apiSnapshots = await getApiSnapshots(CONFIG, logger);

        // Compare snapshots
        const comparisonResults = compareSnapshots(fsSnapshots, apiSnapshots, CONFIG, logger);

        // Generate report (now with await)
        await generateReport(comparisonResults, CONFIG, logger);

        logger.log(chalk.bold('\n===== COMPARISON COMPLETE =====\n'));
    } catch (error) {
        logger.error(`An unexpected error occurred: ${error.message}`);
        logger.error(error.stack);
        process.exit(1);
    }
}

// Run the script with an IIFE to use top-level await
(async () => {
    await main();
})();