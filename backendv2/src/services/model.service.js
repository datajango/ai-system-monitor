'use strict'

const loggerService = require('./logger.service')
const settingsService = require('./settings.service')
const errorService = require('./error.service')
const llmService = require('./llm.service')
const filesystemService = require('./filesystem.service')
const path = require('path')

/**
 * Service for model management
 */
const modelService = {
    /**
     * Model cache
     * @private
     */
    _modelCache: null,

    /**
     * Cache TTL in milliseconds
     * @private
     */
    _cacheTTL: 5 * 60 * 1000, // 5 minutes

    /**
     * Cache timestamp
     * @private
     */
    _cacheTimestamp: 0,

    /**
     * Get all available models
     * @param {Object} options - Options for model retrieval
     * @returns {Promise<Array>} List of models
     */
    async getAllModels(options = {}) {
        try {
            const { forceRefresh = false } = options
            const logger = loggerService.getLogger()

            // Check cache first
            if (!forceRefresh && this._modelCache && (Date.now() - this._cacheTimestamp < this._cacheTTL)) {
                logger.debug('Returning models from cache')
                return [...this._modelCache] // Return a copy
            }

            // Fetch models from LLM service
            logger.debug('Fetching models from LLM service')
            const models = await llmService.getAvailableModels()

            // Update cache
            this._modelCache = models
            this._cacheTimestamp = Date.now()

            return [...models] // Return a copy
        } catch (error) {
            loggerService.error('Error getting models', error)
            throw new Error(`Failed to get models: ${error.message}`)
        }
    },

    /**
     * Get the current model
     * @returns {Promise<Object>} Current model
     */
    async getCurrentModel() {
        try {
            const modelId = settingsService.get('llmDefaultModel')

            // Get all models
            const models = await this.getAllModels()

            // Find the current model
            let currentModel = models.find(model => model.id === modelId)

            // If not found, return first model or basic info
            if (!currentModel) {
                currentModel = models[0] || {
                    id: modelId,
                    name: modelId.split('/').pop() || modelId,
                    description: 'Model details not available'
                }
            }

            return {
                ...currentModel,
                isCurrent: true,
                temperature: settingsService.get('llmTemperature'),
                maxTokens: settingsService.get('llmMaxTokens')
            }
        } catch (error) {
            loggerService.error('Error getting current model', error)
            throw new Error(`Failed to get current model: ${error.message}`)
        }
    },

    /**
     * Set the current model
     * @param {string} modelId - Model ID to set as current
     * @returns {Promise<Object>} Updated model settings
     */
    async setCurrentModel(modelId) {
        try {
            const logger = loggerService.getLogger()

            // Get all models
            const models = await this.getAllModels()

            // Check if model exists
            const modelExists = models.some(model => model.id === modelId)

            if (!modelExists) {
                logger.warn(`Model ${modelId} not found in available models`)
                // Not throwing error as the model might exist but not be in the list
            }

            // Update settings
            await settingsService.update('llmDefaultModel', modelId)

            // Get updated current model
            return this.getCurrentModel()
        } catch (error) {
            loggerService.error(`Error setting current model to ${modelId}`, error)
            throw new Error(`Failed to set current model: ${error.message}`)
        }
    },

    /**
     * Update model parameters
     * @param {Object} params - Model parameters to update
     * @returns {Promise<Object>} Updated model settings
     */
    async updateModelParams(params) {
        try {
            const logger = loggerService.getLogger()

            // Extract parameters
            const { temperature, maxTokens } = params

            // Update settings as needed
            if (temperature !== undefined) {
                logger.debug(`Updating model temperature to ${temperature}`)
                await settingsService.update('llmTemperature', temperature)
            }

            if (maxTokens !== undefined) {
                logger.debug(`Updating model maxTokens to ${maxTokens}`)
                await settingsService.update('llmMaxTokens', maxTokens)
            }

            // Get updated current model
            return this.getCurrentModel()
        } catch (error) {
            loggerService.error('Error updating model parameters', error)
            throw new Error(`Failed to update model parameters: ${error.message}`)
        }
    },

    /**
     * Test model connection
     * @param {string} modelId - Model ID to test
     * @returns {Promise<Object>} Connection test results
     */
    async testModel(modelId) {
        try {
            const logger = loggerService.getLogger()

            // Use current model if not specified
            const model = modelId || settingsService.get('llmDefaultModel')

            logger.debug(`Testing model connection: ${model}`)

            // Test using LLM service
            const result = await llmService.testConnection({ model })

            return result
        } catch (error) {
            loggerService.error(`Error testing model ${modelId}`, error)
            throw new Error(`Failed to test model: ${error.message}`)
        }
    },

    /**
     * Search for models matching criteria
     * @param {Object} criteria - Search criteria
     * @returns {Promise<Array>} Matching models
     */
    async searchModels(criteria) {
        try {
            // Get all models
            const models = await this.getAllModels()

            // Filter based on criteria
            let filtered = [...models]

            if (criteria.query) {
                const query = criteria.query.toLowerCase()
                filtered = filtered.filter(model =>
                    model.id.toLowerCase().includes(query) ||
                    model.name.toLowerCase().includes(query) ||
                    (model.description && model.description.toLowerCase().includes(query))
                )
            }

            return filtered
        } catch (error) {
            loggerService.error('Error searching models', error)
            throw new Error(`Failed to search models: ${error.message}`)
        }
    },

    /**
     * Get model usage statistics
     * @returns {Promise<Object>} Usage statistics
     */
    async getModelUsageStats() {
        try {
            // This is a placeholder - in a real implementation, this would
            // retrieve actual usage statistics from a database or logs

            // For now, return mock data
            return {
                totalRequests: 253,
                tokenUsage: {
                    total: 1250000,
                    prompt: 750000,
                    completion: 500000
                },
                modelUsage: [
                    { model: 'gemma-2-9b-it', requests: 150, tokens: 750000 },
                    { model: 'llama-3-8b-instruct', requests: 73, tokens: 350000 },
                    { model: 'mistral-7b-instruct-v0.2', requests: 30, tokens: 150000 }
                ],
                averageLatency: 2.3, // seconds
                errorRate: 0.02 // 2%
            }
        } catch (error) {
            loggerService.error('Error getting model usage stats', error)
            throw new Error(`Failed to get model usage statistics: ${error.message}`)
        }
    },

    /**
     * Refresh model cache
     * @returns {Promise<Array>} Updated model list
     */
    async refreshModelCache() {
        try {
            const logger = loggerService.getLogger()
            logger.debug('Forcing refresh of model cache')

            // Force refresh
            return this.getAllModels({ forceRefresh: true })
        } catch (error) {
            loggerService.error('Error refreshing model cache', error)
            throw new Error(`Failed to refresh model cache: ${error.message}`)
        }
    }
}

module.exports = modelService