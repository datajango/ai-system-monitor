// backend/src/services/snapshot-file.service.js
'use strict'

const path = require('path')
const fs = require('fs').promises
const environmentService = require('./environment.service')

// Service for snapshot file operations
const snapshotFileService = {
    // Get all files in a snapshot
    async getSnapshotFiles(id) {
        try {
            const snapshotsDir = environmentService.getSnapshotsDir()
            const snapshotDir = path.join(snapshotsDir, id)

            // Check if directory exists
            try {
                await fs.access(snapshotDir)
            } catch (err) {
                return null // Directory doesn't exist
            }

            // Read the directory and get file information
            const files = await fs.readdir(snapshotDir)

            // Map files to include additional information
            const fileDetails = await Promise.all(files.map(async (fileName) => {
                const filePath = path.join(snapshotDir, fileName)
                const stats = await fs.stat(filePath)

                return {
                    name: fileName,
                    path: filePath,
                    size: stats.size,
                    isDirectory: stats.isDirectory(),
                    modifiedTime: stats.mtime.toISOString(),
                    section: path.basename(fileName, '.json') // Extract section name without extension
                }
            }))

            // Sort files by name
            return fileDetails.sort((a, b) => a.name.localeCompare(b.name))
        } catch (err) {
            console.error(`Error getting files for snapshot ${id}:`, err)
            throw new Error(`Failed to retrieve snapshot files: ${err.message}`)
        }
    },

    // Get a specific file from a snapshot
    async getSnapshotFile(id, fileName) {
        try {
            const snapshotsDir = environmentService.getSnapshotsDir()
            const filePath = path.join(snapshotsDir, id, fileName)

            // Check if file exists
            try {
                await fs.access(filePath)
            } catch (err) {
                return null // File doesn't exist
            }

            // Read the file content
            const content = await fs.readFile(filePath, 'utf8')

            // If it's a JSON file, parse it, otherwise return as text
            if (fileName.endsWith('.json')) {
                try {
                    return {
                        fileName,
                        content: JSON.parse(content),
                        type: 'json'
                    }
                } catch (parseErr) {
                    console.error(`Error parsing JSON file ${fileName}:`, parseErr)
                    // Return as text if parsing fails
                    return {
                        fileName,
                        content,
                        type: 'text',
                        parseError: 'Could not parse as JSON'
                    }
                }
            } else {
                return {
                    fileName,
                    content,
                    type: 'text'
                }
            }
        } catch (err) {
            console.error(`Error getting file ${fileName} from snapshot ${id}:`, err)
            throw new Error(`Failed to retrieve file: ${err.message}`)
        }
    },
    async deleteSnapshotById(id) {
        try {
            const snapshotsDir = environmentService.getSnapshotsDir();
            const snapshotDir = path.join(snapshotsDir, id);

            // Check if directory exists
            try {
                await fs.access(snapshotDir);
            } catch (err) {
                return { success: false, message: `Snapshot ${id} not found` };
            }

            // Delete the directory recursively
            // Use the recursive option for Node.js 14+
            await fs.rm(snapshotDir, { recursive: true, force: true });

            return {
                success: true,
                message: `Snapshot ${id} deleted successfully`
            };
        } catch (err) {
            console.error(`Error deleting snapshot ${id}:`, err);
            throw new Error(`Failed to delete snapshot: ${err.message}`);
        }
    }
}

module.exports = snapshotFileService