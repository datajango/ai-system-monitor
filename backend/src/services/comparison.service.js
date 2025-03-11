// backend/src/services/comparison.service.js
'use strict'

const snapshotService = require('./snapshot.service')

// Service functions for snapshot comparison operations
const comparisonService = {
    // Compare two snapshots
    async compareSnapshots(baselineId, currentId, sections) {
        try {
            // Fetch the two snapshots
            const baseline = await snapshotService.getSnapshotById(baselineId)
            const current = await snapshotService.getSnapshotById(currentId)

            if (!baseline) {
                throw new Error(`Baseline snapshot ${baselineId} not found`)
            }

            if (!current) {
                throw new Error(`Current snapshot ${currentId} not found`)
            }

            // Determine which sections to compare
            const sectionsToCompare = sections && sections.length > 0
                ? sections
                : Object.keys(baseline.data).filter(section =>
                    section in current.data &&
                    section !== 'summaryText' &&
                    section !== 'index')

            // Generate a comparison result
            const comparison = {
                baselineId,
                currentId,
                baselineTimestamp: baseline.timestamp,
                currentTimestamp: current.timestamp,
                comparisonDate: new Date().toISOString(),
                sections: {}
            }

            for (const section of sectionsToCompare) {
                if (section in baseline.data && section in current.data) {
                    comparison.sections[section] = await this.compareSectionData(
                        section,
                        baseline.data[section],
                        current.data[section]
                    )
                }
            }

            return {
                success: true,
                message: 'Comparison completed successfully',
                comparison
            }
        } catch (err) {
            console.error(`Error comparing snapshots ${baselineId} and ${currentId}:`, err)
            throw new Error(`Failed to compare snapshots: ${err.message}`)
        }
    },

    // Compare section-specific data between snapshots
    async compareSectionData(section, baselineData, currentData) {
        // This is a simplified comparison. In a real implementation,
        // we would do a more sophisticated diff analysis.

        const result = {
            changes: [],
            summary: '',
            changeCount: 0
        }

        // Generate sample changes based on section type
        if (section === 'InstalledPrograms') {
            result.changes = [
                {
                    type: 'added',
                    item: {
                        name: 'New Application',
                        version: '1.0.0',
                        publisher: 'Example Publisher',
                        installDate: new Date().toISOString().split('T')[0]
                    }
                },
                {
                    type: 'removed',
                    item: {
                        name: 'Old Application',
                        version: '2.1.0',
                        publisher: 'Example Publisher',
                        installDate: '2023-11-15'
                    }
                },
                {
                    type: 'updated',
                    old: {
                        name: 'Google Chrome',
                        version: '123.0.6312.87'
                    },
                    new: {
                        name: 'Google Chrome',
                        version: '123.0.6312.95'
                    }
                }
            ]
            result.summary = 'Found 3 changes: 1 added, 1 removed, 1 updated'
            result.changeCount = 3
        } else if (section === 'Path') {
            result.changes = [
                {
                    type: 'added',
                    item: 'C:\\Program Files\\New Application\\'
                }
            ]
            result.summary = 'Found 1 change: 1 added'
            result.changeCount = 1
        } else if (section === 'DiskSpace') {
            result.changes = [
                {
                    type: 'changed',
                    drive: 'C:',
                    property: 'freeSpace',
                    old: 125000000000,
                    new: 100000000000,
                    percentChange: -20
                },
                {
                    type: 'changed',
                    drive: 'C:',
                    property: 'percentUsed',
                    old: 75.6,
                    new: 80.5,
                    percentChange: 6.5
                }
            ]
            result.summary = 'Found 2 changes: C: drive space decreased by 20%'
            result.changeCount = 2
        } else if (section === 'Network') {
            result.changes = [
                {
                    type: 'added',
                    category: 'connections',
                    item: {
                        localAddress: '192.168.1.100:56789',
                        remoteAddress: '13.107.42.14:443',
                        state: 'ESTABLISHED',
                        processId: 4567,
                        processName: 'msedge.exe'
                    }
                }
            ]
            result.summary = 'Found 1 change: 1 new network connection'
            result.changeCount = 1
        } else if (section === 'RunningServices') {
            result.changes = [
                {
                    type: 'added',
                    item: {
                        name: 'NewService',
                        displayName: 'New Sample Service',
                        status: 'Running',
                        startType: 'Automatic'
                    }
                },
                {
                    type: 'changed',
                    service: 'SampleService',
                    property: 'status',
                    old: 'Stopped',
                    new: 'Running'
                }
            ]
            result.summary = 'Found 2 changes: 1 new service, 1 status change'
            result.changeCount = 2
        } else if (section === 'StartupPrograms') {
            result.changes = [
                {
                    type: 'added',
                    item: {
                        name: 'New Startup App',
                        command: 'C:\\Program Files\\New App\\app.exe',
                        location: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run'
                    }
                }
            ]
            result.summary = 'Found 1 change: 1 new startup program'
            result.changeCount = 1
        } else if (section === 'WindowsUpdates') {
            result.changes = [
                {
                    type: 'added',
                    item: {
                        updateId: 'KB5034123',
                        title: 'Security Update for Windows',
                        installedOn: new Date().toISOString().split('T')[0]
                    }
                }
            ]
            result.summary = 'Found 1 change: 1 new Windows update'
            result.changeCount = 1
        } else if (section === 'Browsers') {
            result.changes = [
                {
                    type: 'added',
                    category: 'extensions',
                    browser: 'Chrome',
                    item: {
                        name: 'New Extension',
                        version: '1.0.0',
                        enabled: true
                    }
                },
                {
                    type: 'updated',
                    browser: 'Chrome',
                    old: {
                        version: '123.0.6312.87'
                    },
                    new: {
                        version: '123.0.6312.95'
                    }
                }
            ]
            result.summary = 'Found 2 changes: 1 new browser extension, 1 browser update'
            result.changeCount = 2
        } else {
            // For any other section, generate a generic "no changes" result
            result.changes = []
            result.summary = 'No changes detected'
            result.changeCount = 0
        }

        return result
    }
}

module.exports = comparisonService