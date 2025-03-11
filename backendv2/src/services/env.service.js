'use strict'

const fs = require('fs').promises
const path = require('path')
const dotenv = require('dotenv')

/**
 * Service for managing environment variables and .env file
 */
const envService = {
    /**
     * Load environment variables from .env file
     * @returns {Promise<Object>} Loaded environment variables
     */
    async loadEnv() {
        try {
            // Load .env file
            const result = dotenv.config()

            if (result.error) {
                console.warn('Failed to load .env file, using existing environment variables')
            }

            return process.env
        } catch (error) {
            console.error('Error loading environment variables:', error)
            throw new Error(`Failed to load environment variables: ${error.message}`)
        }
    },

    /**
     * Get an environment variable with fallback default
     * @param {string} key - Environment variable name
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Value or default
     */
    get(key, defaultValue) {
        return process.env[key] !== undefined ? process.env[key] : defaultValue
    },

    /**
     * Get an environment variable as a number
     * @param {string} key - Environment variable name
     * @param {number} defaultValue - Default value if not found or invalid
     * @returns {number} Value as number or default
     */
    getNumber(key, defaultValue) {
        const value = this.get(key, '')
        const parsed = Number(value)
        return isNaN(parsed) ? defaultValue : parsed
    },

    /**
     * Get an environment variable as a boolean
     * @param {string} key - Environment variable name
     * @param {boolean} defaultValue - Default value if not found
     * @returns {boolean} Value as boolean or default
     */
    getBoolean(key, defaultValue) {
        const value = this.get(key, '').toLowerCase()
        if (value === 'true' || value === '1' || value === 'yes') return true
        if (value === 'false' || value === '0' || value === 'no') return false
        return defaultValue
    },

    /**
     * Get an environment variable as an array
     * @param {string} key - Environment variable name
     * @param {string} delimiter - Delimiter for string splitting
     * @param {Array} defaultValue - Default value if not found
     * @returns {Array} Value as array or default
     */
    getArray(key, delimiter = ',', defaultValue = []) {
        const value = this.get(key, '')
        return value ? value.split(delimiter).map(item => item.trim()) : defaultValue
    },

    /**
     * Set an environment variable (note: this only affects the current process)
     * @param {string} key - Environment variable name
     * @param {*} value - Value to set
     * @returns {void}
     */
    set(key, value) {
        process.env[key] = String(value)
    },

    /**
     * Update the .env file with new values
     * @param {Object} updates - Object with key-value pairs to update
     * @returns {Promise<Object>} Updated environment
     */
    async updateEnvFile(updates) {
        try {
            // Get .env file path, defaulting to project root
            const envPath = path.resolve(process.cwd(), '.env')

            // Read existing .env file or create empty one
            let envContent = ''
            try {
                envContent = await fs.readFile(envPath, 'utf8')
            } catch (error) {
                // File doesn't exist yet, that's ok
                console.info('.env file not found, creating new one')
            }

            // Parse existing content
            const envLines = envContent.split('\n')
            const existingVars = {}

            // Build a map of existing variables
            for (let i = 0; i < envLines.length; i++) {
                const line = envLines[i].trim()
                if (!line || line.startsWith('#')) continue

                const match = line.match(/^([^=]+)=(.*)$/)
                if (match) {
                    const key = match[1].trim()
                    existingVars[key] = i
                }
            }

            // Update existing variables or add new ones
            for (const [key, value] of Object.entries(updates)) {
                const envValue = String(value).includes(' ') ? `"${value}"` : value
                const envLine = `${key}=${envValue}`

                if (key in existingVars) {
                    // Update existing line
                    envLines[existingVars[key]] = envLine
                } else {
                    // Add new line
                    envLines.push(envLine)
                }

                // Update process.env
                this.set(key, value)
            }

            // Write back to .env file
            await fs.writeFile(envPath, envLines.join('\n'))

            return process.env
        } catch (error) {
            console.error('Error updating .env file:', error)
            throw new Error(`Failed to update .env file: ${error.message}`)
        }
    },

    /**
     * Get all environment variables
     * @param {Array} filter - Optional array of keys to include
     * @returns {Object} Environment variables
     */
    getAll(filter = null) {
        const env = { ...process.env }

        // If filter is provided, only include specified keys
        if (Array.isArray(filter)) {
            const filtered = {}
            for (const key of filter) {
                if (key in env) {
                    filtered[key] = env[key]
                }
            }
            return filtered
        }

        return env
    },

    /**
     * Check if a required environment variable is set
     * @param {string} key - Environment variable name
     * @returns {boolean} Whether variable is set
     */
    hasRequired(key) {
        return key in process.env && process.env[key] !== ''
    },

    /**
     * Validate required environment variables
     * @param {Array} required - Array of required variable names
     * @returns {Object} Validation result with missing variables
     */
    validateRequired(required) {
        const missing = required.filter(key => !this.hasRequired(key))
        return {
            valid: missing.length === 0,
            missing
        }
    }
}

module.exports = envService