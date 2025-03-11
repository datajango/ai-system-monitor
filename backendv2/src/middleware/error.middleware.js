'use strict'

const fp = require('fastify-plugin')
const errorService = require('../services/error.service')
const loggerService = require('../services/logger.service')

/**
 * Custom error handler middleware
 * @param {FastifyInstance} fastify - Fastify instance
 * @param {Object} opts - Options
 */
function errorMiddleware(fastify, opts, done) {
    // Set custom error handler
    fastify.setErrorHandler((error, request, reply) => {
        const logger = loggerService.getLogger()

        // Log error details
        logger.error('Request error', {
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name,
                code: error.code
            },
            request: {
                method: request.method,
                url: request.url,
                params: request.params,
                query: request.query,
                headers: request.headers,
                body: request.body
            }
        })

        // Format the error for the response
        const formattedError = errorService.formatError(error)

        // Get the appropriate status code
        const statusCode = errorService.getStatusCode(error)

        // Send the error response
        reply.code(statusCode).send(formattedError)
    })

    // Set not found handler
    fastify.setNotFoundHandler((request, reply) => {
        const logger = loggerService.getLogger()

        // Log not found details
        logger.warn('Route not found', {
            method: request.method,
            url: request.url,
            params: request.params,
            query: request.query
        })

        // Send not found response
        reply.code(404).send({
            error: 'NOT_FOUND',
            message: `Route ${request.method}:${request.url} not found`,
            statusCode: 404
        })
    })

    done()
}

module.exports = fp(errorMiddleware, {
    name: 'errorMiddleware'
})