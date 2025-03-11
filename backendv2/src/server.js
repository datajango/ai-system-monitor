'use strict'

const { createApp } = require('./app')
const envService = require('./services/env.service')
const loggerService = require('./services/logger.service')
const settingsService = require('./services/settings.service')

/**
 * Start the server
 */
async function start() {
    try {
        // Load environment variables
        await envService.loadEnv()

        // Create logger instance
        const logger = loggerService.createLogger()

        // Initialize settings
        await settingsService.init()

        // Create Fastify app
        const app = await createApp({
            logger: {
                level: settingsService.get('logLevel') || 'info',
                transport: settingsService.get('environment') === 'development'
                    ? {
                        target: 'pino-pretty',
                        options: {
                            translateTime: 'HH:MM:ss Z',
                            ignore: 'pid,hostname'
                        }
                    }
                    : undefined
            }
        })

        // Get port from settings
        const PORT = settingsService.get('port')

        // Start listening
        await app.listen({ port: PORT, host: '0.0.0.0' })

        // Log startup information
        logger.info(`Server is running on port ${PORT}`)
        logger.info(`Environment: ${settingsService.get('environment')}`)
        logger.info(`API Documentation: http://localhost:${PORT}/docs`)
        logger.info(`Snapshots directory: ${settingsService.get('snapshotsDir')}`)
        logger.info(`Analysis directory: ${settingsService.get('analysisOutputDir')}`)
    } catch (err) {
        // Log error and exit
        console.error('Error starting server:', err)
        process.exit(1)
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err)
    process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err)
    process.exit(1)
})

// Start the server
start()