'use strict'

const statusService = require('../services/status.service')
const lifecycleService = require('../services/lifecycle.service')
const loggerService = require('../services/logger.service')
const connectionService = require('../services/connection.service')
const errorService = require('../services/error.service')

/**
 * Controller for system operations
 */
const systemController = {
    /**
     * Get system status
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} System status
     */
    async getStatus(request, reply) {
        try {
            const status = statusService.getStatus()
            return reply.code(200).send(status)
        } catch (error) {
            loggerService.error('Error getting system status', error)
            return reply.code(500).send({
                error: 'Failed to get system status',
                message: error.message
            })
        }
    },

    /**
     * Get system health
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} System health information
     */
    async getHealth(request, reply) {
        try {
            const health = statusService.getHealthCheck()
            return reply.code(200).send(health)
        } catch (error) {
            loggerService.error('Error getting system health', error)
            return reply.code(500).send({
                error: 'Failed to get system health',
                message: error.message
            })
        }
    },

    /**
     * Get detailed component status
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Component status
     */
    async getComponentsStatus(request, reply) {
        try {
            const status = await statusService.checkComponents()
            return reply.code(200).send(status)
        } catch (error) {
            loggerService.error('Error getting component status', error)
            return reply.code(500).send({
                error: 'Failed to get component status',
                message: error.message
            })
        }
    },

    /**
     * Restart the system
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Restart result
     */
    async restartSystem(request, reply) {
        try {
            // Log restart request
            const logger = loggerService.getLogger()
            logger.info('System restart requested', {
                user: request.user?.id || 'anonymous',
                ip: request.ip
            })

            // Send response before restarting
            reply.code(202).send({
                message: 'System restart initiated',
                status: 'restarting'
            })

            // Schedule restart
            setTimeout(async () => {
                try {
                    await lifecycleService.restart()
                } catch (error) {
                    logger.error('Error during system restart', error)
                }
            }, 1000)
        } catch (error) {
            loggerService.error('Error initiating system restart', error)
            return reply.code(500).send({
                error: 'Failed to restart system',
                message: error.message
            })
        }
    },

    /**
     * Pause background operations
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Pause result
     */
    async pauseSystem(request, reply) {
        try {
            const result = await lifecycleService.pause()
            return reply.code(200).send(result)
        } catch (error) {
            loggerService.error('Error pausing system', error)
            return reply.code(500).send({
                error: 'Failed to pause system',
                message: error.message
            })
        }
    },

    /**
     * Resume background operations
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Resume result
     */
    async resumeSystem(request, reply) {
        try {
            const result = await lifecycleService.resume()
            return reply.code(200).send(result)
        } catch (error) {
            loggerService.error('Error resuming system', error)
            return reply.code(500).send({
                error: 'Failed to resume system',
                message: error.message
            })
        }
    },

    /**
     * Get system state
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} System state
     */
    async getSystemState(request, reply) {
        try {
            const state = lifecycleService.getState()
            return reply.code(200).send(state)
        } catch (error) {
            loggerService.error('Error getting system state', error)
            return reply.code(500).send({
                error: 'Failed to get system state',
                message: error.message
            })
        }
    },

    /**
     * Terminate the system
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Termination result
     */
    async terminateSystem(request, reply) {
        try {
            // Log termination request
            const logger = loggerService.getLogger()
            logger.info('System termination requested', {
                user: request.user?.id || 'anonymous',
                ip: request.ip
            })

            // Send response before terminating
            reply.code(202).send({
                message: 'System termination initiated',
                status: 'terminating'
            })

            // Schedule termination
            setTimeout(async () => {
                try {
                    await lifecycleService.shutdown()

                    // Exit process
                    process.exit(0)
                } catch (error) {
                    logger.error('Error during system termination', error)
                }
            }, 1000)
        } catch (error) {
            loggerService.error('Error initiating system termination', error)
            return reply.code(500).send({
                error: 'Failed to terminate system',
                message: error.message
            })
        }
    },

    /**
     * Check connection status
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Connection status
     */
    async checkConnections(request, reply) {
        try {
            const results = await connectionService.checkServerHealth()
            return reply.code(200).send(results)
        } catch (error) {
            loggerService.error('Error checking connections', error)
            return reply.code(500).send({
                error: 'Failed to check connections',
                message: error.message
            })
        }
    }
}

module.exports = systemController