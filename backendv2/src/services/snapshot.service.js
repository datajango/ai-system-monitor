'use strict'

const path = require('path')
const loggerService = require('./logger.service')
const filesystemService = require('./filesystem.service')
const errorService = require('./error.service')
const settingsService = require('./settings.service')
const collectorService = require('./collector.service')
const storageService = require('./storage.service')

/**
 * Service for snapshot operations
 */
const snapshotService = {
    /**
     * Get all snapshots
     * @returns {Promise<Array>} List of snapshots
     */
    async getAllSnapshots() {
        try {
            const snapshotsDir = settingsService.get('snapshotsDir')
            const logger = loggerService.getLogger()

            // Ensure snapshots directory exists
            await filesystemService.ensureDir(snapshotsDir)

            // Get directory entries
            const entries = await filesystemService.readDirWithStats(snapshotsDir)

            // Filter for snapshot directories (they typically start with SystemState_)
            const snapshotDirs = entries.filter(entry =>
                entry.isDirectory && entry.name.startsWith('SystemState_')
            )

            // Get metadata for each snapshot
            const snapshots = await Promise.all(
                snapshotDirs.map(async (dir) => {
                    try {
                        return await this.getSnapshotMetadata(dir.name)
                    } catch (error) {
                        logger.warn(`Failed to read metadata for snapshot ${dir.name}`, { error })

                        // Provide basic info for snapshots with missing or invalid metadata
                        return {
                            id: dir.name,
                            timestamp: dir.modified.toISOString(),
                            description: 'Unknown (metadata missing)',
                            status: 'unknown'
                        }
                    }
                })
            )

            // Sort by timestamp, newest first
            return snapshots.sort((a, b) =>
                new Date(b.timestamp) - new Date(a.timestamp)
            )
        } catch (error) {
            loggerService.error('Error getting snapshots', error)
            throw new Error(`Failed to get snapshots: ${error.message}`)
        }
    },

    /**
     * Get snapshot metadata
     * @param {string} id - Snapshot ID
     * @returns {Promise<Object>} Snapshot metadata
     */
    async getSnapshotMetadata(id) {
        try {
            const snapshotsDir = settingsService.get('snapshotsDir')
            const metadataPath = path.join(snapshotsDir, id, 'metadata.json')

            // Check if metadata file exists
            const exists = await filesystemService.exists(metadataPath)

            if (!exists) {
                // Extract basic info from directory name
                const parts = id.split('_')
                let timestamp = new Date().toISOString()
                let description = ''

                if (parts.length >= 3) {
                    const dateStr = parts[1]
                    const timeStr = parts[2].replace(/-/g, ':')
                    timestamp = `${dateStr}T${timeStr}.000Z`
                    description = parts.slice(3).join('_')
                }

                return {
                    id,
                    timestamp,
                    description,
                    status: 'incomplete'
                }
            }

            // Read metadata file
            const metadata = await filesystemService.readJSON(metadataPath)

            return {
                id,
                timestamp: metadata.timestamp,
                description: metadata.description || '',
                status: metadata.status || 'complete',
                collectionDate: metadata.collectionDate,
                collectionTime: metadata.collectionTime,
                ...(metadata.tags && { tags: metadata.tags })
            }
        } catch (error) {
            throw new Error(`Failed to get snapshot metadata: ${error.message}`)
        }
    },

    /**
     * Get a specific snapshot by ID
     * @param {string} id - Snapshot ID
     * @returns {Promise<Object>} Snapshot data
     */
    async getSnapshotById(id) {
        try {
            const snapshotsDir = settingsService.get('snapshotsDir')
            const snapshotDir = path.join(snapshotsDir, id)

            // Check if snapshot directory exists
            const exists = await filesystemService.exists(snapshotDir)

            if (!exists) {
                throw errorService.createNotFoundError('Snapshot', id)
            }

            // Get snapshot metadata
            const metadata = await this.getSnapshotMetadata(id)

            // Get list of data files (excluding metadata.json)
            const files = await filesystemService.readDirWithStats(snapshotDir)
            const dataFiles = files.filter(file =>
                file.isFile && file.name.endsWith('.json') && file.name !== 'metadata.json'
            )

            // Read each data file
            const data = {}
            for (const file of dataFiles) {
                try {
                    const section = path.basename(file.name, '.json')
                    data[section] = await filesystemService.readJSON(file.path)
                } catch (error) {
                    loggerService.warn(`Error reading data file ${file.name}`, { error })
                    // Continue processing other files
                }
            }

            // Try to read summary.txt if it exists
            try {
                const summaryPath = path.join(snapshotDir, 'summary.txt')
                if (await filesystemService.exists(summaryPath)) {
                    data.summaryText = await filesystemService.readFile(summaryPath)
                }
            } catch (error) {
                // Summary file is optional, so no need to fail
                loggerService.debug(`Summary file not found for snapshot ${id}`)
            }

            return {
                ...metadata,
                data
            }
        } catch (error) {
            if (error instanceof errorService.NotFoundError) {
                throw error
            }
            loggerService.error(`Error getting snapshot ${id}`, error)
            throw new Error(`Failed to get snapshot: ${error.message}`)
        }
    },

    /**
     * Create a new snapshot
     * @param {Object} options - Snapshot creation options
     * @returns {Promise<Object>} Created snapshot
     */
    async createSnapshot(options = {}) {
        try {
            // Create snapshot using collector service
            const result = await collectorService.collect(options)

            if (!result.success) {
                throw new Error(`Failed to create snapshot: ${result.message}`)
            }

            // Get the newly created snapshot
            const snapshot = await this.getSnapshotById(result.snapshotId)

            return {
                success: true,
                message: 'Snapshot created successfully',
                snapshot
            }
        } catch (error) {
            loggerService.error('Error creating snapshot', error)
            throw new Error(`Failed to create snapshot: ${error.message}`)
        }
    },

    /**
     * Delete a snapshot
     * @param {string} id - Snapshot ID
     * @returns {Promise<Object>} Operation result
     */
    async deleteSnapshot(id) {
        try {
            const snapshotsDir = settingsService.get('snapshotsDir')
            const snapshotDir = path.join(snapshotsDir, id)

            // Check if snapshot exists
            const exists = await filesystemService.exists(snapshotDir)

            if (!exists) {
                throw errorService.createNotFoundError('Snapshot', id)
            }

            // Delete snapshot directory
            await filesystemService.deleteDir(snapshotDir, true)

            return {
                success: true,
                message: `Snapshot ${id} deleted successfully`
            }
        } catch (error) {
            if (error instanceof errorService.NotFoundError) {
                throw error
            }
            loggerService.error(`Error deleting snapshot ${id}`, error)
            throw new Error(`Failed to delete snapshot: ${error.message}`)
        }
    },

    /**
     * Get files in a snapshot
     * @param {string} id - Snapshot ID
     * @returns {Promise<Array>} List of files
     */
    async getSnapshotFiles(id) {
        try {
            const snapshotsDir = settingsService.get('snapshotsDir')
            const snapshotDir = path.join(snapshotsDir, id)

            // Check if snapshot exists
            const exists = await filesystemService.exists(snapshotDir)

            if (!exists) {
                throw errorService.createNotFoundError('Snapshot', id)
            }

            // Get file list with stats
            const files = await filesystemService.readDirWithStats(snapshotDir)

            // Filter for files only
            const fileList = files
                .filter(file => file.isFile)
                .map(file => ({
                    name: file.name,
                    size: file.size,
                    modified: file.modified,
                    created: file.created,
                    section: file.name.endsWith('.json')
                        ? path.basename(file.name, '.json')
                        : undefined
                }))

            return fileList
        } catch (error) {
            if (error instanceof errorService.NotFoundError) {
                throw error
            }
            loggerService.error(`Error getting files for snapshot ${id}`, error)
            throw new Error(`Failed to get snapshot files: ${error.message}`)
        }
    },

    /**
     * Get a specific file from a snapshot
     * @param {string} id - Snapshot ID
     * @param {string} fileName - File name
     * @returns {Promise<Object>} File content
     */
    async getSnapshotFile(id, fileName) {
        try {
            const snapshotsDir = settingsService.get('snapshotsDir')
            const filePath = path.join(snapshotsDir, id, fileName)

            // Check if snapshot directory exists
            const snapshotDir = path.join(snapshotsDir, id)
            const snapshotExists = await filesystemService.exists(snapshotDir)

            if (!snapshotExists) {
                throw errorService.createNotFoundError('Snapshot', id)
            }

            // Check if file exists
            const fileExists = await filesystemService.exists(filePath)

            if (!fileExists) {
                throw errorService.createNotFoundError('File', fileName)
            }

            // Read file based on extension
            if (fileName.endsWith('.json')) {
                try {
                    const content = await filesystemService.readJSON(filePath)
                    return {
                        fileName,
                        content,
                        type: 'json'
                    }
                } catch (error) {
                    // If JSON parsing fails, return as text
                    loggerService.warn(`Error parsing JSON file ${fileName}`, { error })
                    const content = await filesystemService.readFile(filePath)
                    return {
                        fileName,
                        content,
                        type: 'text',
                        parseError: 'Could not parse as JSON'
                    }
                }
            } else {
                const content = await filesystemService.readFile(filePath)
                return {
                    fileName,
                    content,
                    type: 'text'
                }
            }
        } catch (error) {
            if (error instanceof errorService.NotFoundError) {
                throw error
            }
            loggerService.error(`Error getting file ${fileName} from snapshot ${id}`, error)
            throw new Error(`Failed to get snapshot file: ${error.message}`)
        }
    }
}

module.exports = snapshotService