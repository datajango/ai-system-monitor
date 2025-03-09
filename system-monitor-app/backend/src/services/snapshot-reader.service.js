// backend/src/services/snapshot-reader.service.js
'use strict'

const path = require('path')
const fs = require('fs').promises
const environmentService = require('./environment.service')

// Service for reading snapshot data
const snapshotReaderService = {
    // Get all available system snapshots
    async getAllSnapshots() {
        try {
            const snapshotsDir = environmentService.getSnapshotsDir()

            // Ensure the directory exists
            try {
                await fs.mkdir(snapshotsDir, { recursive: true })
            } catch (err) {
                // Ignore if it already exists
            }

            const files = await fs.readdir(snapshotsDir)

            // Filter for snapshot directories (they typically start with SystemState_)
            const snapshotDirs = []
            for (const file of files) {
                try {
                    const stats = await fs.stat(path.join(snapshotsDir, file))
                    if (stats.isDirectory() && file.startsWith('SystemState_')) {
                        snapshotDirs.push(file)
                    }
                } catch (err) {
                    // Skip files that can't be accessed
                    console.error(`Error accessing ${file}:`, err)
                }
            }

            // Map to snapshot metadata
            const snapshots = await Promise.all(snapshotDirs.map(async (dir) => {
                const dirPath = path.join(snapshotsDir, dir)

                // Try to read metadata.json if it exists
                let metadata = {
                    timestamp: '',
                    description: ''
                }

                try {
                    const metadataPath = path.join(dirPath, 'metadata.json')
                    const metadataContent = await fs.readFile(metadataPath, 'utf8')
                    metadata = JSON.parse(metadataContent)
                } catch (err) {
                    // If metadata file doesn't exist, extract info from directory name
                    const parts = dir.split('_')
                    let timestamp = new Date().toISOString()
                    let description = ''

                    if (parts.length >= 3) {
                        const dateStr = parts[1]
                        const timeStr = parts[2].replace(/-/g, ':')
                        timestamp = `${dateStr}T${timeStr}`
                        description = parts.slice(3).join('_')
                    }

                    metadata = {
                        timestamp,
                        description
                    }
                }

                return {
                    id: dir,
                    timestamp: metadata.timestamp,
                    description: metadata.description,
                    path: dirPath
                }
            }))

            // Sort by timestamp, newest first
            return snapshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        } catch (err) {
            console.error('Error getting snapshots:', err)
            throw new Error(`Failed to retrieve snapshots: ${err.message}`)
        }
    },

    // Get a specific snapshot by ID
    async getSnapshotById(id) {
        try {
            const snapshotsDir = environmentService.getSnapshotsDir()
            const snapshotDir = path.join(snapshotsDir, id)

            // Check if directory exists
            try {
                await fs.access(snapshotDir)
            } catch (err) {
                return null // Directory doesn't exist
            }

            // Read snapshot metadata
            let metadata = {
                timestamp: '',
                description: ''
            }

            try {
                const metadataPath = path.join(snapshotDir, 'metadata.json')
                const metadataContent = await fs.readFile(metadataPath, 'utf8')
                metadata = JSON.parse(metadataContent)
            } catch (err) {
                // If metadata file doesn't exist, extract info from directory name
                const parts = id.split('_')
                let timestamp = new Date().toISOString()
                let description = ''

                if (parts.length >= 3) {
                    const dateStr = parts[1]
                    const timeStr = parts[2].replace(/-/g, ':')
                    timestamp = `${dateStr}T${timeStr}`
                    description = parts.slice(3).join('_')
                }

                metadata = {
                    timestamp,
                    description
                }
            }

            // Read the snapshot data files
            const files = await fs.readdir(snapshotDir)
            const jsonFiles = files.filter(file => file.endsWith('.json') && file !== 'metadata.json')

            // Read and parse each JSON file
            const data = {}
            for (const file of jsonFiles) {
                try {
                    const filePath = path.join(snapshotDir, file)
                    const content = await fs.readFile(filePath, 'utf8')
                    const section = path.basename(file, '.json')
                    data[section] = JSON.parse(content)
                } catch (err) {
                    console.error(`Error reading/parsing ${file}:`, err)
                    // Continue to next file
                }
            }

            // Try to read summary.txt if it exists
            try {
                const summaryPath = path.join(snapshotDir, 'summary.txt')
                const summaryContent = await fs.readFile(summaryPath, 'utf8')
                data.summaryText = summaryContent
            } catch (err) {
                // Summary file might not exist, that's okay
            }

            return {
                id,
                timestamp: metadata.timestamp,
                description: metadata.description,
                data
            }
        } catch (err) {
            console.error(`Error getting snapshot ${id}:`, err)
            throw new Error(`Failed to retrieve snapshot: ${err.message}`)
        }
    }
}

module.exports = snapshotReaderService