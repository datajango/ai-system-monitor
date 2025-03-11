'use strict'

/**
 * Custom error classes
 */
class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
        super(message)
        this.name = this.constructor.name
        this.statusCode = statusCode
        this.errorCode = errorCode
        Error.captureStackTrace(this, this.constructor)
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found', entityType = 'resource') {
        super(message, 404, 'NOT_FOUND')
        this.entityType = entityType
    }
}

class ValidationError extends AppError {
    constructor(message = 'Validation failed', errors = []) {
        super(message, 400, 'VALIDATION_ERROR')
        this.errors = errors
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Not authorized') {
        super(message, 403, 'FORBIDDEN')
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'UNAUTHORIZED')
    }
}

/**
 * Service for error handling functionality
 */
const errorService = {
    // Error classes
    AppError,
    NotFoundError,
    ValidationError,
    AuthorizationError,
    AuthenticationError,

    /**
     * Create an application error
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {string} errorCode - Application error code
     * @returns {AppError} Application error
     */
    createError(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
        return new AppError(message, statusCode, errorCode)
    },

    /**
     * Create a not found error
     * @param {string} entityType - Type of entity not found
     * @param {string} id - ID of entity not found
     * @returns {NotFoundError} Not found error
     */
    createNotFoundError(entityType, id) {
        const message = id
            ? `${entityType} with ID ${id} not found`
            : `${entityType} not found`

        const error = new NotFoundError(message, entityType)
        return error
    },

    /**
     * Create a validation error
     * @param {string} message - Error message
     * @param {Array} errors - Validation errors
     * @returns {ValidationError} Validation error
     */
    createValidationError(message = 'Validation failed', errors = []) {
        return new ValidationError(message, errors)
    },

    /**
     * Create an authorization error
     * @param {string} message - Error message
     * @returns {AuthorizationError} Authorization error
     */
    createAuthorizationError(message = 'Not authorized') {
        return new AuthorizationError(message)
    },

    /**
     * Create an authentication error
     * @param {string} message - Error message
     * @returns {AuthenticationError} Authentication error
     */
    createAuthenticationError(message = 'Authentication required') {
        return new AuthenticationError(message)
    },

    /**
     * Format an error for API response
     * @param {Error} error - Error to format
     * @returns {Object} Formatted error
     */
    formatError(error) {
        // If it's already an AppError, use its properties
        if (error instanceof AppError) {
            return {
                error: error.errorCode,
                message: error.message,
                statusCode: error.statusCode,
                ...(error.errors && { errors: error.errors }),
                ...(error.entityType && { entityType: error.entityType })
            }
        }

        // For regular errors, create a generic error response
        return {
            error: 'INTERNAL_ERROR',
            message: error.message || 'An unexpected error occurred',
            statusCode: 500
        }
    },

    /**
     * Get HTTP status code from error
     * @param {Error} error - Error to check
     * @returns {number} HTTP status code
     */
    getStatusCode(error) {
        return error instanceof AppError ? error.statusCode : 500
    }
}

module.exports = errorService