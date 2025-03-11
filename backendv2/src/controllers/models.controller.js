'use strict'

const modelService = require('../services/model.service')
const connectionService = require('../services/connection.service')
const loggerService = require('../services/logger.service')

/**
 * Controller for model operations
 */
const modelsController = {
    /**
     * Get all available models
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Array>} List of models
     */
    async getAllModels(request, reply) {
        try {
            const { refresh } = request.query || {}
            const forceRefresh = refresh === 'true'

            const models = await modelService.getAllModels({ forceRefresh })
            return reply.code(200).send(models)
        } catch (error) {
            loggerService.error('Error getting all models', error)
            return reply.code(500).send({
                error: 'Failed to fetch models',
                message: error.message
            })
        }
    },

    /**
     * Get the current model
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Current model
     */
    async getCurrentModel(request, reply) {
        try {
            const currentModel = await modelService.getCurrentModel()
            return reply.code(200).send(currentModel)
        } catch (error) {
            loggerService.error('Error getting current model', error)
            return reply.code(500).send({
                error: 'Failed to fetch current model',
                message: error.message
            })
        }
    },

    /**
     * Set the current model
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Updated model settings
     */
    async setCurrentModel(request, reply) {
        try {
            const { modelId } = request.body || {}

            if (!modelId) {
                return reply.code(400).send({
                    error: 'Bad Request',
                    message: 'modelId is required'
                })
            }

            const updatedModel = await modelService.setCurrentModel(modelId)
            return reply.code(200).send(updatedModel)
        } catch (error) {
            loggerService.error('Error setting current model', error)
            return reply.code(500).send({
                error: 'Failed to set current model',
                message: error.message
            })
        }
    },

    /**
     * Update model parameters
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Updated model settings
     */
    async updateModelParams(request, reply) {
        try {
            const { temperature, maxTokens } = request.body || {}

            if (temperature === undefined && maxTokens === undefined) {
                return reply.code(400).send({
                    error: 'Bad Request',
                    message: 'At least one parameter (temperature or maxTokens) is required'
                })
            }

            const updatedModel = await modelService.updateModelParams({
                temperature,
                maxTokens
            })

            return reply.code(200).send(updatedModel)
        } catch (error) {
            loggerService.error('Error updating model parameters', error)
            return reply.code(500).send({
                error: 'Failed to update model parameters',
                message: error.message
            })
        }
    },

    /**
     * Test model connection
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Connection test results
     */
    async testModel(request, reply) {
        try {
            const { modelId } = request.body || {}

            const result = await modelService.testModel(modelId)
            return reply.code(200).send(result)
        } catch (error) {
            loggerService.error('Error testing model', error)
            return reply.code(500).send({
                error: 'Failed to test model',
                message: error.message
            })
        }
    },

    /**
     * Search for models
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Array>} Matching models
     */
    async searchModels(request, reply) {
        try {
            const { query } = request.query || {}

            const models = await modelService.searchModels({ query })
            return reply.code(200).send(models)
        } catch (error) {
            loggerService.error('Error searching models', error)
            return reply.code(500).send({
                error: 'Failed to search models',
                message: error.message
            })
        }
    },

    /**
     * Get model usage statistics
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Usage statistics
     */
    async getModelUsageStats(request, reply) {
        try {
            const stats = await modelService.getModelUsageStats()
            return reply.code(200).send(stats)
        } catch (error) {
            loggerService.error('Error getting model usage stats', error)
            return reply.code(500).send({
                error: 'Failed to get model usage statistics',
                message: error.message
            })
        }
    },

    /**
     * Test LLM connection
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Connection test results
     */
    async testLlmConnection(request, reply) {
        try {
            const { serverUrl, model } = request.body || {}

            const result = await connectionService.testLlmConnection({
                serverUrl,
                model
            })

            return reply.code(200).send(result)
        } catch (error) {
            loggerService.error('Error testing LLM connection', error)
            return reply.code(500).send({
                error: 'Failed to test LLM connection',
                message: error.message
            })
        }
    },

    /**
     * Refresh model cache
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Array>} Updated model list
     */
    async refreshModelCache(request, reply) {
        try {
            const models = await modelService.refreshModelCache()
            return reply.code(200).send(models)
        } catch (error) {
            loggerService.error('Error refreshing model cache', error)
            return reply.code(500).send({
                error: 'Failed to refresh model cache',
                message: error.message
            })
        }
    }
}

module.exports = modelsController