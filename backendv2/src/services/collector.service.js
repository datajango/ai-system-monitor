'use strict'

const path = require('path')
const loggerService = require('./logger.service')
const filesystemService = require('./filesystem.service')
const settingsService = require('./settings.service')
const storageService = require('./storage.service')

/**
 * Service for snapshot data collection
 */
const collectorService = {
    /**
     * Collect a system snapshot
     * @param {Object} options - Collection options
     * @returns {Promise<Object>} Collection result
     */
    async collect(options = {}) {
        try {
            const logger = loggerService.getLogger()
            logger.info('Starting system snapshot collection', { options })

            // Generate a timestamp for the new snapshot
            const now = new Date()
            const dateStr = now.toISOString().split('T')[0]
            const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-')

            // Create snapshot ID with optional description
            const description = options.description
                ? options.description.replace(/[^a-zA-Z0-9_-]/g, '_')
                : ''

            const snapshotId = `SystemState_${dateStr}_${timeStr}${description ? '_' + description : ''}`

            // Create snapshot directory
            const snapshotsDir = settingsService.get('snapshotsDir')
            const snapshotDir = path.join(snapshotsDir, snapshotId)
            await filesystemService.ensureDir(snapshotDir)

            // Create metadata file
            const metadata = {
                timestamp: now.toISOString(),
                description: options.description || '',
                collectionDate: dateStr,
                collectionTime: timeStr.replace(/-/g, ':'),
                status: 'collecting',
                tags: options.tags || [],
                options: {
                    ...options,
                    // Don't include potentially sensitive data in metadata
                    outputPath: undefined,
                    credentials: undefined
                }
            }

            await filesystemService.writeJSON(
                path.join(snapshotDir, 'metadata.json'),
                metadata
            )

            // Collect snapshot data
            // Here we'll use a simulated data collection process
            // In a real implementation, this might call external tools or scripts
            const sampleData = await this.collectSampleData(now)

            // Write data files
            for (const [section, data] of Object.entries(sampleData)) {
                await filesystemService.writeJSON(
                    path.join(snapshotDir, `${section}.json`),
                    data
                )
            }

            // Create a sample index file
            const indexData = {
                id: snapshotId,
                timestamp: metadata.timestamp,
                description: metadata.description,
                sections: Object.keys(sampleData),
                files: Object.keys(sampleData).map(section => `${section}.json`)
            }

            await filesystemService.writeJSON(
                path.join(snapshotDir, 'index.json'),
                indexData
            )

            // Create a summary text file
            const summaryContent = this.generateSummaryText(snapshotId, metadata, sampleData)

            await filesystemService.writeFile(
                path.join(snapshotDir, 'summary.txt'),
                summaryContent
            )

            // Update metadata to mark collection as complete
            metadata.status = 'complete'
            await filesystemService.writeJSON(
                path.join(snapshotDir, 'metadata.json'),
                metadata
            )

            logger.info('Snapshot collection completed', { snapshotId })

            return {
                success: true,
                message: 'System snapshot collected successfully',
                snapshotId,
                output: `Created snapshot ${snapshotId}`
            }
        } catch (error) {
            loggerService.error('Error collecting snapshot', error)
            throw new Error(`Failed to collect snapshot: ${error.message}`)
        }
    },

    /**
     * Generate sample data for testing/development
     * @param {Date} timestamp - Collection timestamp
     * @returns {Promise<Object>} Sample data
     */
    async collectSampleData(timestamp) {
        const now = timestamp || new Date()

        // In a real implementation, this would call actual collection utilities
        // For now, generate representative sample data
        return {
            System: {
                computerName: 'DESKTOP-SAMPLE',
                osVersion: 'Windows 10 Pro',
                processorName: 'Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz',
                installedMemory: '32 GB',
                systemDrive: 'C:',
                systemTime: now.toISOString()
            },
            Network: {
                adapters: [
                    {
                        name: 'Ethernet',
                        ipAddress: '192.168.1.100',
                        macAddress: '00-11-22-33-44-55',
                        status: 'Up'
                    },
                    {
                        name: 'Wi-Fi',
                        ipAddress: '',
                        macAddress: 'AA-BB-CC-DD-EE-FF',
                        status: 'Down'
                    }
                ],
                connections: [
                    {
                        localAddress: '192.168.1.100:54321',
                        remoteAddress: '172.217.20.14:443',
                        state: 'ESTABLISHED',
                        processId: 1234,
                        processName: 'chrome.exe'
                    }
                ]
            },
            InstalledPrograms: {
                count: 52,
                programs: [
                    {
                        name: 'Google Chrome',
                        version: '123.0.6312.87',
                        publisher: 'Google LLC',
                        installDate: '2024-01-15'
                    },
                    {
                        name: 'Mozilla Firefox',
                        version: '124.0',
                        publisher: 'Mozilla',
                        installDate: '2024-02-20'
                    },
                    {
                        name: 'Microsoft Visual Studio Code',
                        version: '1.87.0',
                        publisher: 'Microsoft Corporation',
                        installDate: '2024-03-05'
                    }
                ]
            },
            Path: {
                variables: [
                    'C:\\Windows\\system32',
                    'C:\\Windows',
                    'C:\\Windows\\System32\\Wbem',
                    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\',
                    'C:\\Program Files\\nodejs\\',
                    'C:\\Program Files\\Git\\cmd'
                ],
                invalidPaths: []
            },
            DiskSpace: {
                drives: [
                    {
                        name: 'C:',
                        label: 'System',
                        totalSpace: 512000000000,
                        freeSpace: 125000000000,
                        percentUsed: 75.6
                    },
                    {
                        name: 'D:',
                        label: 'Data',
                        totalSpace: 1024000000000,
                        freeSpace: 650000000000,
                        percentUsed: 36.5
                    }
                ]
            },
            Performance: {
                cpu: {
                    usage: 15.2,
                    temperature: 45.3,
                    processCount: 145
                },
                memory: {
                    total: 34359738368, // 32 GB
                    used: 8589934592,   // 8 GB
                    free: 25769803776,  // 24 GB
                    percentUsed: 25.0
                },
                disk: {
                    readRate: 1500000,  // bytes per second
                    writeRate: 750000,  // bytes per second
                    queueLength: 0.01,
                    responseTime: 12    // milliseconds
                },
                network: {
                    receivedRate: 250000,  // bytes per second
                    sentRate: 50000,       // bytes per second
                    tcpConnections: 35,
                    udpConnections: 8
                }
            }
        }
    },

    /**
     * Generate a text summary of the snapshot
     * @param {string} snapshotId - Snapshot ID
     * @param {Object} metadata - Snapshot metadata
     * @param {Object} data - Snapshot data
     * @returns {string} Summary text
     */
    generateSummaryText(snapshotId, metadata, data) {
        const systemInfo = data.System || {}
        const diskInfo = data.DiskSpace?.drives?.[0] || {}
        const performanceInfo = data.Performance || {}

        return `System Snapshot Summary
-----------------------
ID: ${snapshotId}
Date: ${metadata.collectionDate}
Time: ${metadata.collectionTime}
${metadata.description ? 'Description: ' + metadata.description : ''}

System Information:
- Computer Name: ${systemInfo.computerName || 'Unknown'}
- OS: ${systemInfo.osVersion || 'Unknown'}
- Processor: ${systemInfo.processorName || 'Unknown'}
- Memory: ${systemInfo.installedMemory || 'Unknown'}

Disk Information:
- System Drive: ${diskInfo.name || 'Unknown'}
- Free Space: ${diskInfo.freeSpace ? Math.round(diskInfo.freeSpace / 1024 / 1024 / 1024) + ' GB' : 'Unknown'}
- Used: ${diskInfo.percentUsed ? diskInfo.percentUsed + '%' : 'Unknown'}

Performance Snapshot:
- CPU Usage: ${performanceInfo.cpu?.usage ? performanceInfo.cpu.usage + '%' : 'Unknown'}
- Memory Usage: ${performanceInfo.memory?.percentUsed ? performanceInfo.memory.percentUsed + '%' : 'Unknown'}
- Process Count: ${performanceInfo.cpu?.processCount || 'Unknown'}

This snapshot contains the following sections:
${Object.keys(data).map(section => `- ${section}`).join('\n')}
`
    }
}

module.exports = collectorService