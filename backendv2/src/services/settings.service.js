'use strict'

const envService = require('./env.service')
const filesystemService = require('./filesystem.service')
const loggerService = require('./logger.service')

/**
 * Service for application settings management
 */
const settingsService = {
    // Definition of all supported settings and their defaults
    settingsDefinitions: {
        // Server settings
        port: { env: 'PORT', default: 3000, type: 'number' },
        environment: { env: 'NODE_ENV', default: 'development', type: 'string' },
        logLevel: { env: 'LOG_LEVEL', default: 'info', type: 'string' },
        logFormat: { env: 'LOG_FORMAT', default: 'pretty', type: 'string' },

        // Directory settings
        snapshotsDir: { env: 'SNAPSHOTS_DIR', default: './snapshots', type: 'string' },
        analysisOutputDir: { env: 'ANALYZER_OUTPUT_DIR', default: './analysis', type: 'string' },

        // LLM settings
        llmServerUrl: { env: 'LLM_SERVER_URL', default: 'http://localhost:1234/v1', type: 'string' },
        llmDefaultModel: { env: 'LLM_DEFAULT_MODEL', default: 'gemma-2-9b-it', type: 'string' },
        llmMaxTokens: { env: 'LLM_MAX_TOKENS', default: 4096, type: 'number' },
        llmTemperature: { env: 'LLM_TEMPERATURE', default: 0.7, type: 'number' },

        // CORS settings
        corsAllowedOrigins: { env: 'CORS_ALLOWED_ORIGINS', default: 'http://localhost:5173,http://localhost:3000', type: 'array' },

        // Cache settings
        cacheEnabled: { env: 'CACHE_ENABLED', default: true, type: 'boolean' },
        cacheDuration: { env: 'CACHE_DURATION', default: 3600, type: 'number' },

        // File processing settings
        fileSizeLimit: { env: 'FILE_SIZE_LIMIT', default: '100mb', type: 'string' }
    },

    // Cached settings
    _settings: null,

    /**
     * Initialize settings service
     * @returns {Promise<Object>} Settings object
     */
    async init() {
        // Load all settings from environment
        this._settings = this.getAll()

        // Ensure required directories exist
        await this.ensureDirectories()

        return this._settings
    },

    /**
     * Get a setting value
     * @param {string} key - Setting key
     * @returns {*} Setting value
     */
    get(key) {
        if (!this.settingsDefinitions[key]) {
            return undefined
        }

        const definition = this.settingsDefinitions[key]

        // Get from environment with appropriate type conversion
        switch (definition.type) {
            case 'number':
                return envService.getNumber(definition.env, definition.default)
            case 'boolean':
                return envService.getBoolean(definition.env, definition.default)
            case 'array':
                return envService.getArray(definition.env, ',', Array.isArray(definition.default)
                    ? definition.default
                    : definition.default.split(','))
            default:
                return envService.get(definition.env, definition.default)
        }
    },

    /**
     * Update a setting
     * @param {string} key - Setting key
     * @param {*} value - New value
     * @returns {Promise<Object>} Updated setting
     */
    async update(key, value) {
        if (!this.settingsDefinitions[key]) {
            throw new Error(`Unknown setting: ${key}`)
        }

        const definition = this.settingsDefinitions[key]
        let typedValue = value

        // Convert to appropriate type if needed
        switch (definition.type) {
            case 'number':
                typedValue = Number(value)
                if (isNaN(typedValue)) {
                    throw new Error(`Invalid number value for setting ${key}: ${value}`)
                }
                break
            case 'boolean':
                if (typeof value === 'string') {
                    const lowered = value.toLowerCase()
                    if (['true', '1', 'yes'].includes(lowered)) {
                        typedValue = true
                    } else if (['false', '0', 'no'].includes(lowered)) {
                        typedValue = false
                    } else {
                        throw new Error(`Invalid boolean value for setting ${key}: ${value}`)
                    }
                } else {
                    typedValue = Boolean(value)
                }
                break
            case 'array':
                if (Array.isArray(value)) {
                    typedValue = value.join(',')
                }
                break
        }

        // Update .env file
        await envService.updateEnvFile({ [definition.env]: typedValue })

        // Update cache
        this._settings = null

        return {
            key,
            value: this.get(key),
            updated: true
        }
    },

    /**
     * Get all settings
     * @returns {Object} All settings
     */
    getAll() {
        // Return cached settings if available
        if (this._settings) {
            return { ...this._settings }
        }

        // Build settings object
        const settings = {}

        for (const key of Object.keys(this.settingsDefinitions)) {
            settings[key] = this.get(key)
        }

        // Cache settings
        this._settings = settings

        return { ...settings }
    },

    /**
     * Update multiple settings
     * @param {Object} updates - Key-value pairs to update
     * @returns {Promise<Object>} Results of update operation
     */
    async updateBatch(updates) {
        const envUpdates = {}
        const results = {
            updated: [],
            invalid: [],
            unknown: []
        }

        // Process each update
        for (const [key, value] of Object.entries(updates)) {
            if (!this.settingsDefinitions[key]) {
                results.unknown.push(key)
                continue
            }

            try {
                const definition = this.settingsDefinitions[key]
                let typedValue = value

                // Convert to appropriate type
                switch (definition.type) {
                    case 'number':
                        typedValue = Number(value)
                        if (isNaN(typedValue)) {
                            throw new Error(`Invalid number value: ${value}`)
                        }
                        break
                    case 'boolean':
                        if (typeof value === 'string') {
                            const lowered = value.toLowerCase()
                            if (['true', '1', 'yes'].includes(lowered)) {
                                typedValue = true
                            } else if (['false', '0', 'no'].includes(lowered)) {
                                typedValue = false
                            } else {
                                throw new Error(`Invalid boolean value: ${value}`)
                            }
                        } else {
                            typedValue = Boolean(value)
                        }
                        break
                    case 'array':
                        if (Array.isArray(value)) {
                            typedValue = value.join(',')
                        }
                        break
                }

                envUpdates[definition.env] = typedValue
                results.updated.push(key)
            } catch (error) {
                results.invalid.push({ key, reason: error.message })
            }
        }

        // Update .env file with all valid updates
        if (Object.keys(envUpdates).length > 0) {
            await envService.updateEnvFile(envUpdates)
        }

        // Clear settings cache
        this._settings = null

        return {
            results,
            settings: this.getAll()
        }
    },

    /**
     * Reload settings from environment
     * @returns {Promise<Object>} Reloaded settings
     */
    async reload() {
        await envService.loadEnv()
        this._settings = null
        return this.getAll()
    },

    /**
     * Ensure required directories exist
     * @returns {Promise<void>}
     */
    async ensureDirectories() {
        try {
            const snapshotsDir = this.get('snapshotsDir')
            const analysisOutputDir = this.get('analysisOutputDir')

            // Create directories if they don't exist
            await filesystemService.ensureDir(snapshotsDir)
            await filesystemService.ensureDir(analysisOutputDir)

            const logger = loggerService.getLogger()
            logger.info(`Required directories verified`, { snapshotsDir, analysisOutputDir })
        } catch (error) {
            const logger = loggerService.getLogger()
            logger.error(`Failed to ensure required directories exist`, { error })
            throw new Error(`Failed to create required directories: ${error.message}`)
        }
    },

    /**
     * Validate settings
     * @returns {Object} Validation results
     */
    validate() {
        const issues = []

        // Check required settings
        const requiredSettings = [
            'snapshotsDir',
            'analysisOutputDir'
        ]

        for (const key of requiredSettings) {
            const value = this.get(key)
            if (!value) {
                issues.push({
                    key,
                    message: `Required setting ${key} is not set`
                })
            }
        }

        return {
            valid: issues.length === 0,
            issues
        }
    }
}

module.exports = settingsService