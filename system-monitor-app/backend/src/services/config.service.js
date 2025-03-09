// backend/src/services/config.service.js
'use strict'

const fs = require('fs').promises
const path = require('path')
const { CONFIG_FILE_PATH } = require('../config/config')
const axios = require('axios')

// Default configuration
const DEFAULT_CONFIG = {
    llmServerUrl: 'http://localhost:1234/v1',
    llmModel: 'gemma-2-9b-it',
    llmMaxTokens: 4096,
    llmTemperature: 0.7,
    outputDir: 'analysis_output'
}

// Service functions for configuration operations
const configService = {
    // Get current analyzer configuration
    async getConfig() {
        try {
            // Make sure the config directory exists
            const configDir = path.dirname(CONFIG_FILE_PATH)
            await fs.mkdir(configDir, { recursive: true })

            // Try to read existing config file
            try {
                const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf8')
                return JSON.parse(configData)
            } catch (err) {
                // If file doesn't exist or can't be parsed, create it with defaults
                await this.updateConfig(DEFAULT_CONFIG)
                return DEFAULT_CONFIG
            }
        } catch (err) {
            console.error('Error getting config:', err)
            throw new Error(`Failed to retrieve configuration: ${err.message}`)
        }
    },

    // Update analyzer configuration
    async updateConfig(newConfig) {
        try {
            // Get current config and merge with new values
            const currentConfig = await this.getConfig().catch(() => DEFAULT_CONFIG)
            const updatedConfig = { ...currentConfig, ...newConfig }

            // Create directory if it doesn't exist
            const configDir = path.dirname(CONFIG_FILE_PATH)
            await fs.mkdir(configDir, { recursive: true })

            // Write updated config to file
            await fs.writeFile(
                CONFIG_FILE_PATH,
                JSON.stringify(updatedConfig, null, 2),
                'utf8'
            )

            return updatedConfig
        } catch (err) {
            console.error('Error updating config:', err)
            throw new Error(`Failed to update configuration: ${err.message}`)
        }
    },

    // Get available LLM models
    async getAvailableModels() {
        try {
            // Get current config to use the server URL
            const config = await this.getConfig()

            // Query LM Studio API for available models
            try {
                const response = await axios.get(`${config.llmServerUrl}/models`)
                return response.data.data.map(model => ({
                    id: model.id,
                    name: model.id.split('/').pop(),
                    description: `${model.description || 'No description'}`
                }))
            } catch (apiErr) {
                // If API call fails, return a default list of commonly used models
                return [
                    { id: 'gemma-2-9b-it', name: 'Gemma 2 9B Instruct', description: 'Google\'s Gemma 2 9B Instruct model' },
                    { id: 'llama-3-8b-instruct', name: 'Llama 3 8B Instruct', description: 'Meta\'s Llama 3 8B Instruct model' },
                    { id: 'mistral-7b-instruct-v0.2', name: 'Mistral 7B Instruct', description: 'Mistral AI\'s 7B Instruct model' }
                ]
            }
        } catch (err) {
            console.error('Error getting available models:', err)
            throw new Error(`Failed to retrieve available models: ${err.message}`)
        }
    },

    // Test LLM server connection
    async testLlmConnection(serverUrl, model) {
        try {
            // Use provided values or get from config
            const config = await this.getConfig()
            const url = serverUrl || config.llmServerUrl
            const modelName = model || config.llmModel

            // Prepare a simple test request
            const testPrompt = "Respond with 'Connection successful' if you can read this."
            const requestData = {
                model: modelName,
                messages: [{ role: "user", content: testPrompt }],
                max_tokens: 20,
                temperature: 0.7
            }

            // Track request time
            const startTime = Date.now()

            // Send test request to LLM server
            const response = await axios.post(`${url}/chat/completions`, requestData, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000 // 10 second timeout
            })

            // Calculate response time
            const responseTime = Date.now() - startTime

            return {
                success: true,
                message: 'LLM connection successful',
                responseTime,
                model: modelName,
                serverUrl: url
            }
        } catch (err) {
            console.error('Error testing LLM connection:', err)
            throw new Error(`LLM connection test failed: ${err.message}`)
        }
    }
}

module.exports = configService