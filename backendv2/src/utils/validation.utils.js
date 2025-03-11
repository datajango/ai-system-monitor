'use strict'

const constants = require('../common/constants')
const errorService = require('../services/error.service')

/**
 * Validation utilities
 */
const validationUtils = {
    /**
     * Validate model options
     * @param {Object} options - Model options 
     * @returns {Object} Validated options
     */
    validateModelOptions(options) {
        const { model, temperature, maxTokens } = options || {}
        const errors = []

        // Check model if provided
        if (model !== undefined && typeof model !== 'string') {
            errors.push('model must be a string')
        }

        // Check temperature if provided
        if (temperature !== undefined) {
            if (typeof temperature !== 'number') {
                errors.push('temperature must be a number')
            } else if (temperature < 0 || temperature > 1) {
                errors.push('temperature must be between 0 and 1')
            }
        }

        // Check maxTokens if provided
        if (maxTokens !== undefined) {
            if (typeof maxTokens !== 'number') {
                errors.push('maxTokens must be a number')
            } else if (maxTokens < 1) {
                errors.push('maxTokens must be greater than 0')
            }
        }

        // If there are errors, throw a validation error
        if (errors.length > 0) {
            throw errorService.createValidationError(
                'Invalid model options',
                errors
            )
        }

        return {
            model,
            temperature,
            maxTokens
        }
    },

    /**
     * Validate snapshot creation options
     * @param {Object} options - Snapshot creation options
     * @returns {Object} Validated options
     */
    validateSnapshotOptions(options) {
        const { description, tags } = options || {}
        const errors = []

        // Check description if provided
        if (description !== undefined && typeof description !== 'string') {
            errors.push('description must be a string')
        }

        // Check tags if provided
        if (tags !== undefined) {
            if (!Array.isArray(tags)) {
                errors.push('tags must be an array')
            } else {
                for (const tag of tags) {
                    if (typeof tag !== 'string') {
                        errors.push('each tag must be a string')
                        break
                    }
                }
            }
        }

        // If there are errors, throw a validation error
        if (errors.length > 0) {
            throw errorService.createValidationError(
                'Invalid snapshot options',
                errors
            )
        }

        return {
            description,
            tags
        }
    },

    /**
     * Validate analysis options
     * @param {Object} options - Analysis options
     * @returns {Object} Validated options
     */
    validateAnalysisOptions(options) {
        const { model, sections, focus, depth } = options || {}
        const errors = []

        // Check model if provided
        if (model !== undefined && typeof model !== 'string') {
            errors.push('model must be a string')
        }

        // Check sections if provided
        if (sections !== undefined) {
            if (!Array.isArray(sections)) {
                errors.push('sections must be an array')
            } else {
                for (const section of sections) {
                    if (typeof section !== 'string') {
                        errors.push('each section must be a string')
                        break
                    }

                    // Check if it's a valid section
                    if (!constants.SNAPSHOT.VALID_SECTIONS.includes(section)) {
                        errors.push(`invalid section: ${section}`)
                    }
                }
            }
        }

        // Check focus if provided
        if (focus !== undefined) {
            if (!Array.isArray(focus)) {
                errors.push('focus must be an array')
            } else {
                for (const area of focus) {
                    if (typeof area !== 'string') {
                        errors.push('each focus area must be a string')
                        break
                    }

                    // Check if it's a valid focus area
                    if (!constants.ANALYSIS.FOCUS_AREAS.includes(area)) {
                        errors.push(`invalid focus area: ${area}`)
                    }
                }
            }
        }

        // Check depth if provided
        if (depth !== undefined) {
            if (typeof depth !== 'string') {
                errors.push('depth must be a string')
            } else if (!constants.ANALYSIS.DEPTH_LEVELS.includes(depth)) {
                errors.push(`invalid depth level: ${depth}, must be one of ${constants.ANALYSIS.DEPTH_LEVELS.join(', ')}`)
            }
        }

        // If there are errors, throw a validation error
        if (errors.length > 0) {
            throw errorService.createValidationError(
                'Invalid analysis options',
                errors
            )
        }

        return {
            model,
            sections,
            focus,
            depth
        }
    },

    /**
     * Validate an ID string
     * @param {string} id - ID to validate
     * @param {string} prefix - Expected prefix
     * @returns {boolean} True if valid
     */
    isValidId(id, prefix = constants.SNAPSHOT.ID_PREFIX) {
        if (typeof id !== 'string') {
            return false
        }

        // Must start with the prefix
        if (!id.startsWith(prefix)) {
            return false
        }

        // Typically has a date in the format YYYY-MM-DD
        const datePattern = /\d{4}-\d{2}-\d{2}/
        if (!datePattern.test(id)) {
            return false
        }

        return true
    },

    /**
     * Validate a setting key and value
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     * @param {Object} definitions - Setting definitions
     * @returns {Object} Validated setting
     */
    validateSetting(key, value, definitions) {
        if (!definitions[key]) {
            throw new Error(`Unknown setting: ${key}`)
        }

        const definition = definitions[key]
        let typedValue = value

        // Validate and convert type based on definition
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
                    typedValue = value
                } else if (typeof value === 'string') {
                    typedValue = value.split(',').map(item => item.trim())
                } else {
                    throw new Error(`Invalid array value for setting ${key}: ${value}`)
                }
                break
        }

        return {
            key,
            value: typedValue
        }
    },

    /**
     * Check if an object is empty
     * @param {Object} obj - Object to check
     * @returns {boolean} True if empty
     */
    isEmptyObject(obj) {
        return obj && Object.keys(obj).length === 0 && obj.constructor === Object
    },

    /**
     * Check if a value is defined (not undefined or null)
     * @param {*} value - Value to check
     * @returns {boolean} True if defined
     */
    isDefined(value) {
        return value !== undefined && value !== null
    },

    /**
     * Validate environment variables
     * @param {Object} env - Environment variables
     * @param {Array} required - Required variables
     * @returns {Object} Validation result
     */
    validateEnv(env, required) {
        const missing = []

        for (const key of required) {
            if (!env[key] || env[key].trim() === '') {
                missing.push(key)
            }
        }

        return {
            valid: missing.length === 0,
            missing
        }
    }
}

module.exports = validationUtils