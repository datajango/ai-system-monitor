// backend/src/services/environment.service.js
'use strict'

const path = require('path')
const fs = require('fs').promises
const dotenv = require('dotenv')

// Load environment variables from .env file
dotenv.config()

// Environment service for managing environment-based configuration
const environmentService = {
    // Get environment variable with default fallback
    get(key, defaultValue) {
        return process.env[key] || defaultValue
    },

    // Get Snapshots directory path
    getSnapshotsDir() {
        return this.get('SNAPSHOTS_DIR', path.join(process.cwd(), 'snapshots'))
    },

    // Get Analysis output directory path
    getAnalyzerOutputDir() {
        return this.get('ANALYZER_OUTPUT_DIR', path.join(process.cwd(), 'analysis'))
    },

    // Get LLM server URL
    getLlmServerUrl() {
        return this.get('LLM_SERVER_URL', 'http://localhost:1234/v1')
    },

    // Get default LLM model
    getDefaultLlmModel() {
        return this.get('LLM_DEFAULT_MODEL', 'gemma-2-9b-it')
    },

    // Get LLM max tokens
    getLlmMaxTokens() {
        return parseInt(this.get('LLM_MAX_TOKENS', '4096'), 10)
    },

    // Get LLM temperature
    getLlmTemperature() {
        return parseFloat(this.get('LLM_TEMPERATURE', '0.7'))
    },

    // Get file size limit
    getFileSizeLimit() {
        return this.get('FILE_SIZE_LIMIT', '100mb')
    },

    // Check if we're in development mode
    isDevelopment() {
        return this.get('NODE_ENV', 'development') === 'development'
    },

    // Get server port
    getPort() {
        return parseInt(this.get('PORT', '3000'), 10)
    },

    // Get logging level
    getLogLevel() {
        return this.get('LOG_LEVEL', 'info')
    },

    // Get all environment variables with defaults
    getAll() {
        return {
            port: this.getPort(),
            nodeEnv: this.get('NODE_ENV', 'development'),
            snapshotsDir: this.getSnapshotsDir(),
            analyzerOutputDir: this.getAnalyzerOutputDir(),
            llmServerUrl: this.getLlmServerUrl(),
            llmDefaultModel: this.getDefaultLlmModel(),
            llmMaxTokens: this.getLlmMaxTokens(),
            llmTemperature: this.getLlmTemperature(),
            logLevel: this.getLogLevel(),
            logFormat: this.get('LOG_FORMAT', 'pretty'),
            fileSizeLimit: this.getFileSizeLimit(),
            corsAllowedOrigins: this.get('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(','),
            cacheEnabled: this.get('CACHE_ENABLED', 'true') === 'true',
            cacheDuration: parseInt(this.get('CACHE_DURATION', '3600'), 10)
        }
    },

    // Validate required environment variables
    validate() {
        const requiredVars = [
            'SNAPSHOTS_DIR',
            'ANALYZER_OUTPUT_DIR'
        ]

        const missing = requiredVars.filter(varName => !process.env[varName])

        if (missing.length > 0) {
            console.warn(`Warning: Missing required environment variables: ${missing.join(', ')}`)
            console.warn('Using default values instead')
        }

        return missing.length === 0
    },

    // Ensure required directories exist
    async ensureDirectories() {
        const dirs = [
            this.getSnapshotsDir(),
            this.getAnalyzerOutputDir()
        ]

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true })
                console.log(`Directory exists or was created: ${dir}`)
            } catch (err) {
                console.error(`Error ensuring directory ${dir} exists:`, err)
                throw new Error(`Failed to ensure directory exists: ${dir}`)
            }
        }
    }
}

module.exports = environmentService