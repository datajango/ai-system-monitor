'use strict'

const os = require('os')
const loggerService = require('./logger.service')
const settingsService = require('./settings.service')

/**
 * Service for system status operations
 */
const statusService = {
    // Application start time
    startTime: Date.now(),

    /**
     * Get system status
     * @returns {Object} System status information
     */
    getStatus() {
        const currentTime = Date.now()
        const uptime = Math.floor((currentTime - this.startTime) / 1000) // seconds

        return {
            status: 'running',
            timestamp: new Date().toISOString(),
            uptime: uptime,
            environment: settingsService.get('environment'),
            version: '1.0.0',
            process: {
                pid: process.pid,
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            },
            system: {
                hostname: os.hostname(),
                platform: os.platform(),
                arch: os.arch(),
                release: os.release(),
                cpus: os.cpus().length,
                totalMemory: os.totalmem(),
                freeMemory: os.freemem(),
                loadAverage: os.loadavg()
            }
        }
    },

    /**
     * Get health check status
     * @returns {Object} Health check information
     */
    getHealthCheck() {
        // Simple health check with basic info
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            memoryUsage: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
        }
    },

    /**
     * Check components status (e.g., database, cache, etc.)
     * @returns {Promise<Object>} Components status
     */
    async checkComponents() {
        const componentsStatus = {
            filesystem: await this.checkFilesystem(),
            // Add other component checks here as they are implemented
            // database: await this.checkDatabase(),
            // cache: await this.checkCache(),
            // llm: await this.checkLlmService(),
        }

        return {
            status: Object.values(componentsStatus).every(component => component.status === 'up')
                ? 'healthy'
                : 'degraded',
            timestamp: new Date().toISOString(),
            components: componentsStatus
        }
    },

    /**
     * Check filesystem status
     * @returns {Promise<Object>} Filesystem status
     */
    async checkFilesystem() {
        try {
            const snapshotsDir = settingsService.get('snapshotsDir')
            const analysisOutputDir = settingsService.get('analysisOutputDir')

            // Add checks for directories (implementation would depend on filesystem.service)

            return {
                status: 'up',
                message: 'Filesystem is accessible',
                directories: {
                    snapshots: snapshotsDir,
                    analysis: analysisOutputDir
                }
            }
        } catch (error) {
            loggerService.error('Error checking filesystem status', error)
            return {
                status: 'down',
                message: 'Filesystem check failed',
                error: error.message
            }
        }
    }
}

module.exports = statusService