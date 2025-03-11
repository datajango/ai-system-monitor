'use strict'

const pino = require('pino')
const envService = require('./env.service')

/**
 * Service for logging functionality
 */
const loggerService = {
    /**
     * Create a logger instance
     * @param {Object} options - Logger options
     * @returns {Object} Pino logger instance
     */
    createLogger(options = {}) {
        const logLevel = envService.get('LOG_LEVEL', 'info')
        const logFormat = envService.get('LOG_FORMAT', 'pretty')

        // Configure logger options
        const loggerOptions = {
            level: logLevel,
            timestamp: pino.stdTimeFunctions.isoTime,
            base: undefined,
            ...options
        }

        // Add pretty printing in development
        if (logFormat === 'pretty') {
            return pino({
                ...loggerOptions,
                transport: {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        levelFirst: true,
                        translateTime: 'SYS:standard'
                    }
                }
            })
        }

        return pino(loggerOptions)
    },

    /**
     * The default logger instance
     */
    logger: null,

    /**
     * Initialize the default logger
     * @returns {Object} Logger instance
     */
    init() {
        this.logger = this.createLogger()
        return this.logger
    },

    /**
     * Get the default logger, initializing if needed
     * @returns {Object} Logger instance
     */
    getLogger() {
        if (!this.logger) {
            this.init()
        }
        return this.logger
    },

    /**
     * Log at debug level
     * @param {string} message - Message to log
     * @param {Object} data - Optional data to include
     */
    debug(message, data = {}) {
        this.getLogger().debug(data, message)
    },

    /**
     * Log at info level
     * @param {string} message - Message to log
     * @param {Object} data - Optional data to include
     */
    info(message, data = {}) {
        this.getLogger().info(data, message)
    },

    /**
     * Log at warn level
     * @param {string} message - Message to log
     * @param {Object} data - Optional data to include
     */
    warn(message, data = {}) {
        this.getLogger().warn(data, message)
    },

    /**
     * Log at error level
     * @param {string} message - Message to log
     * @param {Object|Error} error - Error object or data to include
     */
    error(message, error = {}) {
        // If error is an Error instance, extract useful properties
        const errorData = error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
                ...error
            }
            : error

        this.getLogger().error(errorData, message)
    },

    /**
     * Log at fatal level
     * @param {string} message - Message to log
     * @param {Object} data - Optional data to include
     */
    fatal(message, data = {}) {
        this.getLogger().fatal(data, message)
    },

    /**
     * Create a child logger with additional context
     * @param {Object} bindings - Context to add to all logs
     * @returns {Object} Child logger instance
     */
    child(bindings) {
        return this.getLogger().child(bindings)
    },

    /**
     * Create a logger for a specific module
     * @param {string} module - Module name
     * @returns {Object} Logger with module context
     */
    forModule(module) {
        return this.child({ module })
    }
}

module.exports = loggerService