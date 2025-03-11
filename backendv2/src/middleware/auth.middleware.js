'use strict'

const fp = require('fastify-plugin')
const loggerService = require('../services/logger.service')
const errorService = require('../services/error.service')
const settingsService = require('../services/settings.service')

/**
 * Authentication middleware
 * @param {FastifyInstance} fastify - Fastify instance
 * @param {Object} opts - Options
 */
function authMiddleware(fastify, opts, done) {
    // Add authentication hook
    fastify.addHook('onRequest', async (request, reply) => {
        // Skip authentication for development environment or if authentication is disabled
        const environment = settingsService.get('environment')
        const authEnabled = settingsService.get('authEnabled')

        if (environment === 'development' || !authEnabled) {
            // In development or when auth is disabled, set a dummy user
            request.user = { id: 'dev-user', role: 'admin' }
            return
        }

        // Skip authentication for certain routes
        const skipAuthPaths = [
            '/',
            '/health',
            '/docs',
            '/docs/*',
            '/api/v1/system/health'
        ]

        if (skipAuthPaths.some(path => {
            if (path.endsWith('*')) {
                const prefix = path.slice(0, -1)
                return request.url.startsWith(prefix)
            }
            return request.url === path
        })) {
            return
        }

        try {
            // Get authentication header
            const authHeader = request.headers.authorization

            if (!authHeader) {
                throw errorService.createAuthenticationError('Authentication required')
            }

            // Extract token from header
            const parts = authHeader.split(' ')

            if (parts.length !== 2 || parts[0] !== 'Bearer') {
                throw errorService.createAuthenticationError('Invalid authorization format')
            }

            const token = parts[1]

            // Verify token - in a real implementation, this would
            // validate against a real token or JWT
            // For now, we'll accept a hard-coded token for demonstration

            const validToken = settingsService.get('jwtSecret') || 'test-token-12345'

            if (token !== validToken) {
                throw errorService.createAuthenticationError('Invalid token')
            }

            // Set user on request
            request.user = {
                id: 'authenticated-user',
                role: 'admin'
            }
        } catch (error) {
            const logger = loggerService.getLogger()

            logger.warn('Authentication failed', {
                method: request.method,
                url: request.url,
                error: error.message
            })

            // Format the error for the response
            const formattedError = errorService.formatError(error)

            // Send the error response and stop processing
            reply.code(401).send(formattedError)
        }
    })

    done()
}

module.exports = fp(authMiddleware, {
    name: 'authMiddleware'
})