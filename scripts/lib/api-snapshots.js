const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Fetches snapshots from API
 * @param {Object} config - Configuration object
 * @param {Object} logger - Logger utility
 * @returns {Promise<Array>} Array of snapshot objects
 */
async function getApiSnapshots(config, logger) {
    logger.info('Fetching snapshots from API...');

    try {
        // Get all snapshots
        const snapshotsResponse = await axios.get(`${config.API_BASE_URL}/snapshots`);
        const snapshots = snapshotsResponse.data;

        logger.success(`Found ${snapshots.length} snapshots from API`);

        // Get details for each snapshot including files
        const detailedSnapshots = [];

        for (const snapshot of snapshots) {
            logger.info(`Fetching details for snapshot ${snapshot.id}...`);

            // Create directory for this snapshot
            const snapshotDir = path.join(config.API_SNAPSHOTS_DIR, snapshot.id);
            if (!fs.existsSync(snapshotDir)) {
                fs.mkdirSync(snapshotDir, { recursive: true });
            }

            // Get snapshot details
            const detailsResponse = await axios.get(`${config.API_BASE_URL}/snapshots/${snapshot.id}`);

            // Save snapshot details
            fs.writeFileSync(
                path.join(snapshotDir, 'details.json'),
                JSON.stringify(detailsResponse.data, null, 2)
            );

            // Get snapshot files
            const filesResponse = await axios.get(`${config.API_BASE_URL}/snapshots/${snapshot.id}/files`);

            // Save files list
            fs.writeFileSync(
                path.join(snapshotDir, '_files_list.json'),
                JSON.stringify(filesResponse.data, null, 2)
            );

            const files = [];

            // Fetch content of each file
            for (const fileInfo of filesResponse.data) {
                if (fileInfo.name.endsWith('.json')) {
                    try {
                        logger.info(`Fetching file ${fileInfo.name} for snapshot ${snapshot.id}...`);
                        const fileResponse = await axios.get(`${config.API_BASE_URL}/snapshots/${snapshot.id}/files/${fileInfo.name}`);

                        // Save file content
                        if (fileResponse.data && fileResponse.data.content) {
                            let content = fileResponse.data.content;

                            // Handle content that might be a string or an object
                            if (typeof content === 'string') {
                                try {
                                    // Try to parse if it's a JSON string
                                    content = JSON.parse(content);
                                } catch {
                                    // If parsing fails, keep it as a string
                                }
                            }

                            // Write the content with pretty formatting
                            fs.writeFileSync(
                                path.join(snapshotDir, fileInfo.name),
                                JSON.stringify(content, null, 2)
                            );

                            files.push({
                                name: fileInfo.name,
                                size: fileInfo.size,
                                content: content
                            });
                        } else {
                            // Save the raw response if structure is different
                            fs.writeFileSync(
                                path.join(snapshotDir, fileInfo.name),
                                JSON.stringify(fileResponse.data, null, 2)
                            );

                            files.push({
                                name: fileInfo.name,
                                size: fileInfo.size,
                                content: fileResponse.data
                            });
                        }
                    } catch (error) {
                        logger.error(`Error fetching file ${fileInfo.name}: ${error.message}`);

                        // Save error information
                        fs.writeFileSync(
                            path.join(snapshotDir, `${fileInfo.name}.error.txt`),
                            `Error fetching file: ${error.message}`
                        );

                        files.push({
                            name: fileInfo.name,
                            size: fileInfo.size,
                            content: null,
                            error: error.message
                        });
                    }
                }
            }

            detailedSnapshots.push({
                id: snapshot.id,
                metadata: {
                    timestamp: snapshot.timestamp,
                    description: snapshot.description,
                    status: snapshot.status
                },
                files
            });
        }

        return detailedSnapshots;
    } catch (error) {
        logger.error(`Error fetching snapshots from API: ${error.message}`);
        return [];
    }
}

module.exports = { getApiSnapshots };