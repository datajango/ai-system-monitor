// backend/src/services/snapshot-creator.service.js
'use strict'

const path = require('path')
const fs = require('fs').promises
const environmentService = require('./environment.service')

// Service for creating snapshots
const snapshotCreatorService = {
    // Run a new system snapshot collection
    async runCollection({ outputPath, description, compareWithLatest }) {
        try {
            // For testing/development, we'll simulate creating a snapshot
            // In production, this would call the actual PowerShell collector script

            const snapshotsDir = environmentService.getSnapshotsDir()

            // Ensure the directory exists
            await fs.mkdir(snapshotsDir, { recursive: true })

            // Generate a timestamp for the new snapshot
            const now = new Date()
            const dateStr = now.toISOString().split('T')[0]
            const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-')

            // Create snapshot ID
            const snapshotId = `SystemState_${dateStr}_${timeStr}${description ? '_' + description : ''}`
            const snapshotPath = path.join(snapshotsDir, snapshotId)

            // Create snapshot directory
            await fs.mkdir(snapshotPath, { recursive: true })

            // Create metadata file
            const metadata = {
                timestamp: now.toISOString(),
                description: description || '',
                collectionDate: dateStr,
                collectionTime: timeStr.replace(/-/g, ':'),
                compareWithLatest: !!compareWithLatest
            }

            await fs.writeFile(
                path.join(snapshotPath, 'metadata.json'),
                JSON.stringify(metadata, null, 2),
                'utf8'
            )

            // Create some sample data files based on the actual structure
            const sampleData = await require('./sample-data.service').generateSampleData(now);

            // Write sample data files
            for (const [section, data] of Object.entries(sampleData)) {
                await fs.writeFile(
                    path.join(snapshotPath, `${section}.json`),
                    JSON.stringify(data, null, 2),
                    'utf8'
                )
            }

            // Create a sample index.json that lists all the collected files
            const indexData = {
                id: snapshotId,
                timestamp: metadata.timestamp,
                description: metadata.description,
                files: Object.keys(sampleData).map(section => `${section}.json`)
            }

            await fs.writeFile(
                path.join(snapshotPath, 'index.json'),
                JSON.stringify(indexData, null, 2),
                'utf8'
            )

            // Create a sample summary.txt
            const summaryContent = `System Snapshot Summary
-----------------------
Date: ${dateStr}
Time: ${timeStr.replace(/-/g, ':')}
${description ? 'Description: ' + description : ''}

System Information:
- Computer Name: DESKTOP-SAMPLE
- OS: Windows 10 Pro
- Processor: Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz
- Memory: 32 GB

This is a sample snapshot summary created for testing purposes.
The actual summary would contain more detailed information about the system state.
`

            await fs.writeFile(
                path.join(snapshotPath, 'summary.txt'),
                summaryContent,
                'utf8'
            )

            // In a real implementation, we would call the PowerShell script
            // const collectorPath = path.resolve(__dirname, '../../../collector/Collector.ps1')
            // const args = []
            // ...

            return {
                success: true,
                message: 'System snapshot collected successfully',
                snapshotId,
                output: `Created snapshot ${snapshotId}`
            }
        } catch (err) {
            console.error('Error running collection:', err)
            throw new Error(`Failed to run collection: ${err.message}`)
        }
    }
}

module.exports = snapshotCreatorService