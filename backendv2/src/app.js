'use strict'

const fastify = require('fastify')
const cors = require('@fastify/cors')
const swagger = require('@fastify/swagger')
const settingsService = require('./services/settings.service')
const { corsConfig } = require('./common/cors')
const { swaggerConfig } = require('./common/swagger')
const errorMiddleware = require('./middleware/error.middleware')
const loggerMiddleware = require('./middleware/logger.middleware')
const systemRoutes = require('./routes/system.routes')
const snapshotsRoutes = require('./routes/snapshots.routes')
const analysesRoutes = require('./routes/analyses.routes')
const modelsRoutes = require('./routes/models.routes')
const settingsRoutes = require('./routes/settings.routes')

/**
 * Create and configure the Fastify application
 * @param {Object} options - Application options
 * @returns {FastifyInstance} - Configured Fastify instance
 */
async function createApp(options = {}) {
    // Create Fastify instance
    const app = fastify({
        ...options,
        schemaController: {
            schema: {
                allowUnionTypes: true
            }
        },
        ajv: {
            customOptions: {
                allowUnionTypes: true,
                strictTypes: false // Disable strict type checking
            }
        }
    })

    // Register middleware
    app.register(loggerMiddleware)
    app.register(errorMiddleware)

    // Register plugins
    app.register(cors, corsConfig())
    app.register(swagger, swaggerConfig())

    // Register routes
    app.register(systemRoutes, { prefix: '/api/v1/system' })
    app.register(snapshotsRoutes, { prefix: '/api/v1/snapshots' })
    app.register(analysesRoutes, { prefix: '/api/v1/analyses' })
    app.register(modelsRoutes, { prefix: '/api/v1/models' })
    app.register(settingsRoutes, { prefix: '/api/v1/settings' })

    // Root route
    app.get('/', async (request, reply) => {
        return {
            status: 'System Monitor API v2 is running',
            environment: settingsService.get('environment'),
            version: '1.0.0',
            documentation: '/docs',
            endpoints: [
                '/api/v1/system',
                '/api/v1/snapshots',
                '/api/v1/analyses',
                '/api/v1/models',
                '/api/v1/settings'
            ]
        }
    })

    // Health check endpoint
    app.get('/health', async (request, reply) => {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }
    })

    return app
}

module.exports = { createApp }