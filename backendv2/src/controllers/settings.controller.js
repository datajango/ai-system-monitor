'use strict'

const settingsService = require('../services/settings.service')
const loggerService = require('../services/logger.service')

/**
 * Controller for settings operations
 */
const settingsController = {
    /**
     * Get all settings
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} All settings
     */
    async getAllSettings(request, reply) {
        try {
            const settings = settingsService.getAll()
            return reply.code(200).send(settings)
        } catch (error) {
            loggerService.error('Error getting all settings', error)
            return reply.code(500).send({
                error: 'Failed to fetch settings',
                message: error.message
            })
        }
    },

    /**
     * Get a specific setting
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Setting value
     */
    async getSetting(request, reply) {
        try {
            const { key } = request.params
            const value = settingsService.get(key)

            if (value === undefined) {
                return reply.code(404).send({
                    error: 'Setting not found',
                    message: `Setting with key '${key}' not found`
                })
            }

            return reply.code(200).send({
                key,
                value
            })
        } catch (error) {
            loggerService.error(`Error getting setting ${request.params.key}`, error)
            return reply.code(500).send({
                error: 'Failed to fetch setting',
                message: error.message
            })
        }
    },

    /**
     * Update a specific setting
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Updated setting
     */
    async updateSetting(request, reply) {
        try {
            const { key } = request.params
            const { value } = request.body

            if (value === undefined) {
                return reply.code(400).send({
                    error: 'Bad Request',
                    message: 'value is required'
                })
            }

            const result = await settingsService.update(key, value)

            return reply.code(200).send(result)
        } catch (error) {
            loggerService.error(`Error updating setting ${request.params.key}`, error)

            if (error.message.includes('Unknown setting')) {
                return reply.code(404).send({
                    error: 'Setting not found',
                    message: error.message
                })
            }

            return reply.code(500).send({
                error: 'Failed to update setting',
                message: error.message
            })
        }
    },

    /**
     * Update multiple settings
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Update results
     */
    async updateBatchSettings(request, reply) {
        try {
            const updates = request.body

            if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
                return reply.code(400).send({
                    error: 'Bad Request',
                    message: 'Request body must be an object with at least one key-value pair'
                })
            }

            const result = await settingsService.updateBatch(updates)

            return reply.code(200).send(result)
        } catch (error) {
            loggerService.error('Error updating multiple settings', error)
            return reply.code(500).send({
                error: 'Failed to update settings',
                message: error.message
            })
        }
    },

    /**
     * Reload settings from .env file
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Reloaded settings
     */
    async reloadSettings(request, reply) {
        try {
            const settings = await settingsService.reload()
            return reply.code(200).send({
                success: true,
                message: 'Settings reloaded successfully',
                settings
            })
        } catch (error) {
            loggerService.error('Error reloading settings', error)
            return reply.code(500).send({
                error: 'Failed to reload settings',
                message: error.message
            })
        }
    },

    /**
     * Validate settings
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Validation results
     */
    async validateSettings(request, reply) {
        try {
            const validation = settingsService.validate()
            return reply.code(200).send(validation)
        } catch (error) {
            loggerService.error('Error validating settings', error)
            return reply.code(500).send({
                error: 'Failed to validate settings',
                message: error.message
            })
        }
    }
}

module.exports = settingsController