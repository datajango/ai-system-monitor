// backend/src/controllers/config.controller.js
'use strict'

const configService = require('../services/config.service')

// Controller functions for configuration operations
const configController = {
    // Get current analyzer configuration
    async getConfig(request, reply) {
        try {
            const config = await configService.getConfig()
            return reply.code(200).send(config)
        } catch (err) {
            request.log.error(err)
            return reply.code(500).send({ error: 'Failed to fetch configuration', message: err.message })
        }
    },

    // Update analyzer configuration
    async updateConfig(request, reply) {
        try {
            const newConfig = request.body
            const updatedConfig = await configService.updateConfig(newConfig)

            return reply.code(200).send({
                success: true,
                message: 'Configuration updated successfully',
                config: updatedConfig
            })
        } catch (err) {
            request.log.error(err)
            return reply.code(500).send({
                success: false,
                error: 'Failed to update configuration',
                message: err.message
            })
        }
    },

    // Get available LLM models
    async getAvailableModels(request, reply) {
        try {
            const models = await configService.getAvailableModels()
            return reply.code(200).send(models)
        } catch (err) {
            request.log.error(err)
            return reply.code(500).send({ error: 'Failed to fetch available models', message: err.message })
        }
    },

    // Test LLM server connection
    async testLlmConnection(request, reply) {
        try {
            const { serverUrl, model } = request.body
            const result = await configService.testLlmConnection(serverUrl, model)

            return reply.code(200).send(result)
        } catch (err) {
            request.log.error(err)
            return reply.code(500).send({
                success: false,
                error: 'LLM connection test failed',
                message: err.message
            })
        }
    }
}

module.exports = configController