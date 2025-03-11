// backend/src/server.js
'use strict'

const path = require('path')
const { serverConfig, corsConfig } = require('./config/config')
const environmentService = require('./services/environment.service')

// Initialize fastify with environment-based configuration
const fastify = require('fastify')(serverConfig)

// Import routes
const systemRoutes = require('./routes/v1/system.routes')
const configRoutes = require('./routes/v1/config.routes')

// Register plugins
fastify.register(require('@fastify/cors'), corsConfig)

// Setup API documentation with swagger
fastify.register(require('@fastify/swagger'), {
    routePrefix: '/docs',
    swagger: {
        info: {
            title: 'System Monitor API',
            description: 'API for System State Monitor and Analyzer',
            version: '0.1.0'
        },
        externalDocs: {
            url: 'https://github.com/yourusername/system-monitor',
            description: 'Find more info here'
        },
        host: `localhost:${environmentService.getPort()}`,
        schemes: ['http'],
        consumes: ['application/json'],
        produces: ['application/json']
    },
    exposeRoute: true
})

// Register routes
fastify.register(systemRoutes, { prefix: '/api/v1/system' })
fastify.register(configRoutes, { prefix: '/api/v1/config' })

// Root route
fastify.get('/', async (request, reply) => {
    return {
        status: 'System Monitor API is running',
        environment: environmentService.get('NODE_ENV', 'development'),
        version: '0.1.0'
    }
})

// Run server
const start = async () => {
    try {
        // Validate environment and ensure directories exist
        environmentService.validate()
        await environmentService.ensureDirectories()

        // Start server
        const PORT = environmentService.getPort()
        await fastify.listen({ port: PORT, host: '0.0.0.0' })
        fastify.log.info(`Server is running on port ${PORT}`)
        fastify.log.info(`Environment: ${environmentService.get('NODE_ENV', 'development')}`)
        fastify.log.info(`Snapshots directory: ${environmentService.getSnapshotsDir()}`)
        fastify.log.info(`Analysis directory: ${environmentService.getAnalyzerOutputDir()}`)
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

start()