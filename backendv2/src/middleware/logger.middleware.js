'use strict'

const fp = require('fastify-plugin')
const loggerService = require('../services/logger.service')

/**
 * Request logging middleware
 * @param {FastifyInstance} fastify - Fastify instance
 * @param {Object} opts - Options
 */
function loggerMiddleware(fastify, opts, done) {
    // Add request logging hook
    fastify.addHook('onRequest', (request, reply, done) => {
        const logger = loggerService.getLogger()

        // Create request ID if not present
        if (!request.id) {
            request.id = generateRequestId()
        }

        // Attach start time to request
        request.startTime = Date.now()

        // Log request details
        logger.debug('Request received', {
            requestId: request.id,
            method: request.method,
            url: request.url,
            ip: request.ip,
            params: request.params,
            query: request.query,
            headers: maskSensitiveHeaders(request.headers)
        })

        done()
    })

    // Add response logging hook
    fastify.addHook('onResponse', (request, reply, done) => {
        const logger = loggerService.getLogger()

        // Calculate response time
        const responseTime = Date.now() - request.startTime

        // Log response details
        logger.debug('Response sent', {
            requestId: request.id,
            method: request.method,
            url: request.url,
            statusCode: reply.statusCode,
            responseTime: `${responseTime}ms`
        })

        // Log slow responses
        if (responseTime > 1000) {
            logger.warn('Slow response detected', {
                requestId: request.id,
                method: request.method,
                url: request.url,
                responseTime: `${responseTime}ms`
            })
        }

        done()
    })

    // Add error logging hook
    fastify.addHook('onError', (request, reply, error, done) => {
        const logger = loggerService.getLogger()

        // Calculate response time
        const responseTime = Date.now() - request.startTime

        // Log error details
        logger.error('Request error', {
            requestId: request.id,
            method: request.method,
            url: request.url,
            statusCode: reply.statusCode,
            responseTime: `${responseTime}ms`,
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name,
                code: error.code
            }
        })

        done()
    })

    done()
}

/**
 * Generate a unique request ID
 * @returns {string} Request ID
 */
function generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 12)
}

/**
 * Mask sensitive information in headers
 * @param {Object} headers - Request headers
 * @returns {Object} Masked headers
 */
function maskSensitiveHeaders(headers) {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key']
    const maskedHeaders = { ...headers }

    for (const header of sensitiveHeaders) {
        if (maskedHeaders[header]) {
            maskedHeaders[header] = '[REDACTED]'
        }
    }

    return maskedHeaders
}

module.exports = fp(loggerMiddleware, {
    name: 'loggerMiddleware'
})