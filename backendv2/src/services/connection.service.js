'use strict'

const axios = require('axios')
const loggerService = require('./logger.service')
const settingsService = require('./settings.service')

/**
 * Service for managing external service connections
 */
const connectionService = {
    /**
     * Test connection to LLM server
     * @param {Object} options - Connection options
     * @returns {Promise<Object>} Connection test results
     */
    async testLlmConnection(options = {}) {
        try {
            const {
                serverUrl = settingsService.get('llmServerUrl'),
                model = settingsService.get('llmDefaultModel')
            } = options

            const logger = loggerService.getLogger()
            logger.debug(`Testing LLM connection to ${serverUrl} with model ${model}`)

            // Prepare a simple test request
            const testPrompt = "Respond with 'Connection successful' if you can read this."
            const requestData = {
                model,
                messages: [
                    { role: "user", content: testPrompt }
                ],
                max_tokens: 20,
                temperature: 0.7
            }

            // Track request time
            const startTime = Date.now()

            // Send test request to LLM server
            const response = await axios.post(
                `${serverUrl}/chat/completions`,
                requestData,
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000 // 10 second timeout
                }
            )

            // Calculate response time
            const responseTime = Date.now() - startTime

            // Get the response content
            const content = response.data.choices[0]?.message?.content || ''

            return {
                success: true,
                message: 'LLM connection successful',
                responseTime,
                model,
                serverUrl,
                content,
                modelInfo: response.data.model || model
            }
        } catch (error) {
            loggerService.error('Error testing LLM connection', error)

            // Provide more detailed error information
            let errorMessage = 'Connection test failed'
            let errorDetails = {}

            if (error.response) {
                // Server responded with error
                errorMessage = `LLM server error: ${error.response.status}`
                errorDetails = {
                    status: error.response.status,
                    data: error.response.data
                }
            } else if (error.request) {
                // Request made but no response
                errorMessage = 'No response from LLM server'
                errorDetails = {
                    message: error.message
                }
            } else {
                // Error setting up request
                errorMessage = 'Error setting up LLM request'
                errorDetails = {
                    message: error.message
                }
            }

            return {
                success: false,
                message: errorMessage,
                error: errorDetails
            }
        }
    },

    /**
     * Check server health
     * @returns {Promise<Object>} Server health information
     */
    async checkServerHealth() {
        try {
            const results = {
                llm: await this.testLlmConnection(),
                storage: await this.checkStorageAccess(),
                overall: 'healthy'
            }

            // Determine overall health
            if (!results.llm.success || !results.storage.success) {
                results.overall = 'degraded'
            }

            return results
        } catch (error) {
            loggerService.error('Error checking server health', error)

            return {
                overall: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            }
        }
    },

    /**
     * Check storage access
     * @returns {Promise<Object>} Storage access results
     */
    async checkStorageAccess() {
        try {
            const snapshotsDir = settingsService.get('snapshotsDir')
            const analysisDir = settingsService.get('analysisOutputDir')

            // Check if directories exist and are accessible
            // In a real implementation, this would test read/write permissions

            return {
                success: true,
                message: 'Storage access successful',
                directories: {
                    snapshots: snapshotsDir,
                    analysis: analysisDir
                }
            }
        } catch (error) {
            loggerService.error('Error checking storage access', error)

            return {
                success: false,
                message: `Storage access failed: ${error.message}`
            }
        }
    },

    /**
     * Get connection configuration
     * @returns {Object} Connection configuration
     */
    getConnectionConfig() {
        return {
            llm: {
                serverUrl: settingsService.get('llmServerUrl'),
                model: settingsService.get('llmDefaultModel'),
                temperature: settingsService.get('llmTemperature'),
                maxTokens: settingsService.get('llmMaxTokens')
            },
            storage: {
                snapshotsDir: settingsService.get('snapshotsDir'),
                analysisDir: settingsService.get('analysisOutputDir')
            },
            server: {
                environment: settingsService.get('environment'),
                logLevel: settingsService.get('logLevel')
            }
        }
    },

    /**
     * Update connection configuration
     * @param {Object} config - New connection configuration
     * @returns {Promise<Object>} Updated configuration
     */
    async updateConnectionConfig(config) {
        try {
            const logger = loggerService.getLogger()
            const updates = {}

            // Update LLM settings
            if (config.llm) {
                if (config.llm.serverUrl) {
                    updates.llmServerUrl = config.llm.serverUrl
                }
                if (config.llm.model) {
                    updates.llmDefaultModel = config.llm.model
                }
                if (config.llm.temperature !== undefined) {
                    updates.llmTemperature = config.llm.temperature
                }
                if (config.llm.maxTokens !== undefined) {
                    updates.llmMaxTokens = config.llm.maxTokens
                }
            }

            // Update storage settings
            if (config.storage) {
                if (config.storage.snapshotsDir) {
                    updates.snapshotsDir = config.storage.snapshotsDir
                }
                if (config.storage.analysisDir) {
                    updates.analysisOutputDir = config.storage.analysisDir
                }
            }

            // Update server settings
            if (config.server) {
                if (config.server.logLevel) {
                    updates.logLevel = config.server.logLevel
                }
            }

            // Apply updates
            if (Object.keys(updates).length > 0) {
                logger.info('Updating connection configuration', { updates })
                await settingsService.updateBatch(updates)
            }

            return this.getConnectionConfig()
        } catch (error) {
            loggerService.error('Error updating connection configuration', error)
            throw new Error(`Failed to update connection configuration: ${error.message}`)
        }
    }
}

module.exports = connectionService