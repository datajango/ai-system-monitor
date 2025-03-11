'use strict'

const path = require('path')
const loggerService = require('./logger.service')
const filesystemService = require('./filesystem.service')
const settingsService = require('./settings.service')

/**
 * Service for snapshot storage management
 */
const storageService = {
    /**
     * Create a new snapshot storage location
     * @param {string} id - Snapshot ID
     * @returns {Promise<Object>} Storage information
     */
    async createSnapshotStorage(id) {
        try {
            const snapshotsDir = settingsService.get('snapshotsDir')
            const snapshotDir = path.join(snapshotsDir, id)

            // Create directory structure
            await filesystemService.ensureDir(snapshotDir)

            return {
                success: true,
                id,
                path: snapshotDir,
                created: new Date().toISOString()
            }
        } catch (error) {
            loggerService.error(`Error creating storage for snapshot ${id}`, error)
            throw new Error(`Failed to create snapshot storage: ${error.message}`)
        }
    },

    /**
     * Store a snapshot section
     * @param {string} id - Snapshot ID
     * @param {string} section - Section name
     * @param {Object} data - Section data
     * @returns {Promise<Object>} Storage result
     */
    async storeSnapshotSection(id, section, data) {
        try {
            const snapshotsDir = settingsService.get('snapshotsDir')
            const filePath = path.join(snapshotsDir, id, `${section}.json`)

            // Ensure snapshot directory exists
            await filesystemService.ensureDir(path.dirname(filePath))

            // Write section data
            await filesystemService.writeJSON(filePath, data)

            return {
                success: true,
                id,
                section,
                stored: new Date().toISOString()
            }
        } catch (error) {
            loggerService.error(`Error storing section ${section} for snapshot ${id}`, error)
            throw new Error(`Failed to store snapshot section: ${error.message}`)
        }
    },

    /**
     * Store snapshot metadata
     * @param {string} id - Snapshot ID
     * @param {Object} metadata - Snapshot metadata
     * @returns {Promise<Object>} Storage result
     */
    async storeSnapshotMetadata(id, metadata) {
        try {
            const snapshotsDir = settingsService.get('snapshotsDir')
            const filePath = path.join(snapshotsDir, id, 'metadata.json')

            // Ensure snapshot directory exists
            await filesystemService.ensureDir(path.dirname(filePath))

            // Write metadata
            await filesystemService.writeJSON(filePath, metadata)

            return {
                success: true,
                id,
                stored: new Date().toISOString()
            }
        } catch (error) {
            loggerService.error(`Error storing metadata for snapshot ${id}`, error)
            throw new Error(`Failed to store snapshot metadata: ${error.message}`)
        }
    },

    /**
     * Store a text file in the snapshot
     * @param {string} id - Snapshot ID
     * @param {string} fileName - File name
     * @param {string} content - File content
     * @returns {Promise<Object>} Storage result
     */
    async storeSnapshotTextFile(id, fileName, content) {
        try {
            const snapshotsDir = settingsService.get('snapshotsDir')
            const filePath = path.join(snapshotsDir, id, fileName)

            // Ensure snapshot directory exists
            await filesystemService.ensureDir(path.dirname(filePath))

            // Write text file
            await filesystemService.writeFile(filePath, content)

            return {
                success: true,
                id,
                fileName,
                stored: new Date().toISOString()
            }
        } catch (error) {
            loggerService.error(`Error storing file ${fileName} for snapshot ${id}`, error)
            throw new Error(`Failed to store snapshot file: ${error.message}`)
        }
    },

    /**
     * Check available storage space
     * @returns {Promise<Object>} Storage space information
     */
    async checkStorageSpace() {
        try {
            // Note: This is a placeholder implementation
            // In a real-world scenario, this would check the actual disk space
            // using OS-specific methods or libraries

            const snapshotsDir = settingsService.get('snapshotsDir')

            // For now, return a mock response
            return {
                path: snapshotsDir,
                totalSpace: 1000000000000, // 1 TB
                freeSpace: 500000000000,   // 500 GB
                usedSpace: 500000000000,   // 500 GB
                percentUsed: 50.0
            }
        } catch (error) {
            loggerService.error('Error checking storage space', error)
            throw new Error(`Failed to check storage space: ${error.message}`)
        }
    },

    /**
     * Cleanup old snapshots based on retention policy
     * @param {Object} options - Cleanup options
     * @returns {Promise<Object>} Cleanup results
     */
    async cleanupOldSnapshots(options = {}) {
        try {
            const {
                maxAge = 90,          // Maximum age in days
                maxCount = 100,       // Maximum number of snapshots to keep
                dryRun = false        // Whether to actually delete or just report
            } = options

            const logger = loggerService.getLogger()
            logger.info('Starting snapshot cleanup', { maxAge, maxCount, dryRun })

            // Get all snapshots
            const snapshotsDir = settingsService.get('snapshotsDir')
            const entries = await filesystemService.readDirWithStats(snapshotsDir)

            // Filter for snapshot directories
            const snapshots = entries
                .filter(entry => entry.isDirectory && entry.name.startsWith('SystemState_'))
                .map(entry => ({
                    id: entry.name,
                    path: path.join(snapshotsDir, entry.name),
                    created: entry.created
                }))
                .sort((a, b) => b.created - a.created) // Newest first

            const now = new Date()
            const maxAgeDate = new Date(now.getTime() - (maxAge * 24 * 60 * 60 * 1000))

            // Identify snapshots to delete
            const toDelete = []

            // First, check for age-based deletion
            for (const snapshot of snapshots) {
                if (snapshot.created < maxAgeDate) {
                    toDelete.push(snapshot)
                }
            }

            // Then, check for count-based deletion (of remaining snapshots)
            const remaining = snapshots.filter(s => !toDelete.includes(s))
            if (remaining.length > maxCount) {
                // Delete oldest snapshots that exceed the max count
                toDelete.push(...remaining.slice(maxCount))
            }

            // Perform deletion if not a dry run
            const deleted = []
            if (!dryRun) {
                for (const snapshot of toDelete) {
                    try {
                        await filesystemService.deleteDir(snapshot.path, true)
                        deleted.push(snapshot.id)
                        logger.info(`Deleted old snapshot: ${snapshot.id}`)
                    } catch (error) {
                        logger.error(`Error deleting snapshot ${snapshot.id}`, error)
                        // Continue with other deletions
                    }
                }
            }

            return {
                success: true,
                identified: toDelete.length,
                deleted: deleted.length,
                snapshots: dryRun ? toDelete.map(s => s.id) : deleted
            }
        } catch (error) {
            loggerService.error('Error cleaning up old snapshots', error)
            throw new Error(`Failed to cleanup old snapshots: ${error.message}`)
        }
    }
}

module.exports = storageService