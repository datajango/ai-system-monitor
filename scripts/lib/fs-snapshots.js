const fs = require('fs');
const path = require('path');

/**
 * Gets snapshots information from filesystem
 * @param {Object} config - Configuration object
 * @param {Object} logger - Logger utility
 * @returns {Promise<Array>} Array of snapshot objects
 */
async function getFileSystemSnapshots(config, logger) {
    logger.info('Scanning filesystem snapshots...');

    const snapshots = [];

    // Read all directories in the snapshots folder
    const snapshotDirs = fs.readdirSync(config.SNAPSHOTS_DIR)
        .filter(item => fs.statSync(path.join(config.SNAPSHOTS_DIR, item)).isDirectory())
        .filter(dir => dir.startsWith('SystemState_'));

    // Process each snapshot directory
    for (const snapshotDir of snapshotDirs) {
        const snapshotPath = path.join(config.SNAPSHOTS_DIR, snapshotDir);

        // Create a matching directory in our output for filesystem snapshots
        const outputSnapshotDir = path.join(config.FS_SNAPSHOTS_DIR, snapshotDir);
        if (!fs.existsSync(outputSnapshotDir)) {
            fs.mkdirSync(outputSnapshotDir, { recursive: true });
        }

        // Read metadata file
        const metadataPath = path.join(snapshotPath, 'metadata.json');
        if (!fs.existsSync(metadataPath)) {
            logger.warning(`No metadata.json found in ${snapshotDir}, skipping`);
            continue;
        }

        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

        // Save metadata to our output directory
        fs.writeFileSync(
            path.join(outputSnapshotDir, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
        );

        // Get list of files
        const files = fs.readdirSync(snapshotPath)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(snapshotPath, file);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                let parsedContent;

                try {
                    parsedContent = JSON.parse(fileContent);

                    // Save the parsed content to our output directory
                    fs.writeFileSync(
                        path.join(outputSnapshotDir, file),
                        JSON.stringify(parsedContent, null, 2)
                    );
                } catch (error) {
                    logger.warning(`Could not parse ${file} in ${snapshotDir}: ${error.message}`);
                    parsedContent = null;

                    // Save the raw content instead
                    fs.writeFileSync(
                        path.join(outputSnapshotDir, file),
                        fileContent
                    );
                }

                return {
                    name: file,
                    size: fs.statSync(filePath).size,
                    content: parsedContent
                };
            });

        snapshots.push({
            id: snapshotDir,
            metadata,
            files
        });
    }

    logger.success(`Found ${snapshots.length} snapshots in filesystem`);
    return snapshots;
}

module.exports = { getFileSystemSnapshots };