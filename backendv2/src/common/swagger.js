'use strict'

const constants = require('./constants')
const settingsService = require('../services/settings.service')

/**
 * Swagger configuration
 * @returns {Object} Swagger configuration object
 */
function swaggerConfig() {
    return {
        routePrefix: '/docs',
        swagger: {
            info: {
                title: 'System Monitor API',
                description: 'API for System State Monitor and Analyzer',
                version: constants.VERSION
            },
            externalDocs: {
                url: 'https://github.com/yourusername/system-monitor',
                description: 'Find more info here'
            },
            host: `localhost:${settingsService.get('port') || constants.DEFAULT_PORT}`,
            schemes: ['http'],
            consumes: ['application/json'],
            produces: ['application/json'],
            tags: [
                { name: 'system', description: 'System operations' },
                { name: 'snapshots', description: 'System snapshot management' },
                { name: 'analyses', description: 'Snapshot analysis operations' },
                { name: 'models', description: 'LLM model management' },
                { name: 'settings', description: 'Application settings' }
            ],
            securityDefinitions: {
                apiKey: {
                    type: 'apiKey',
                    name: 'Authorization',
                    in: 'header'
                }
            }
        },
        uiConfig: {
            docExpansion: 'list',
            deepLinking: true
        },
        staticCSP: true,
        transformStaticCSP: (header) => header,
        exposeRoute: true
    }
}

module.exports = { swaggerConfig }