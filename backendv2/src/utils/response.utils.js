'use strict'

const constants = require('../common/constants')

/**
 * Utilities for formatting API responses
 */
const responseUtils = {
    /**
     * Create a success response
     * @param {*} data - Response data
     * @param {string} message - Success message
     * @param {number} statusCode - HTTP status code
     * @returns {Object} Success response
     */
    success(data = null, message = 'Operation successful', statusCode = constants.HTTP_STATUS.OK) {
        return {
            success: true,
            message,
            statusCode,
            data
        }
    },

    /**
     * Create an error response
     * @param {string} message - Error message
     * @param {string} errorCode - Error code
     * @param {number} statusCode - HTTP status code
     * @param {*} details - Additional details
     * @returns {Object} Error response
     */
    error(message = 'Operation failed', errorCode = constants.ERROR_CODES.INTERNAL_ERROR, statusCode = constants.HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) {
        return {
            success: false,
            error: errorCode,
            message,
            statusCode,
            ...(details && { details })
        }
    },

    /**
     * Create a not found response
     * @param {string} entity - Entity type that was not found
     * @param {string} id - ID that was not found
     * @returns {Object} Not found response
     */
    notFound(entity, id) {
        return this.error(
            `${entity} with ID ${id} not found`,
            constants.ERROR_CODES.NOT_FOUND,
            constants.HTTP_STATUS.NOT_FOUND
        )
    },

    /**
     * Create a validation error response
     * @param {string} message - Error message
     * @param {Array} errors - Validation errors
     * @returns {Object} Validation error response
     */
    validationError(message = 'Validation failed', errors = []) {
        return this.error(
            message,
            constants.ERROR_CODES.VALIDATION_ERROR,
            constants.HTTP_STATUS.BAD_REQUEST,
            { errors }
        )
    },

    /**
     * Create an unauthorized response
     * @param {string} message - Error message
     * @returns {Object} Unauthorized response
     */
    unauthorized(message = 'Authentication required') {
        return this.error(
            message,
            constants.ERROR_CODES.UNAUTHORIZED,
            constants.HTTP_STATUS.UNAUTHORIZED
        )
    },

    /**
     * Create a forbidden response
     * @param {string} message - Error message
     * @returns {Object} Forbidden response
     */
    forbidden(message = 'Not authorized to perform this action') {
        return this.error(
            message,
            constants.ERROR_CODES.FORBIDDEN,
            constants.HTTP_STATUS.FORBIDDEN
        )
    },

    /**
     * Create a created response
     * @param {*} data - Created resource data
     * @param {string} message - Success message
     * @returns {Object} Created response
     */
    created(data, message = 'Resource created successfully') {
        return this.success(data, message, constants.HTTP_STATUS.CREATED)
    },

    /**
     * Create an accepted response
     * @param {string} message - Success message
     * @returns {Object} Accepted response
     */
    accepted(message = 'Request accepted for processing') {
        return this.success(null, message, constants.HTTP_STATUS.ACCEPTED)
    },

    /**
     * Create a no content response (for successful operations with no response body)
     * @returns {Object} No content response
     */
    noContent() {
        return {
            statusCode: constants.HTTP_STATUS.NO_CONTENT
        }
    },

    /**
     * Create a paginated response
     * @param {Array} items - List of items
     * @param {number} page - Current page
     * @param {number} pageSize - Page size
     * @param {number} total - Total items
     * @returns {Object} Paginated response
     */
    paginated(items, page, pageSize, total) {
        const totalPages = Math.ceil(total / pageSize)

        return this.success({
            items,
            pagination: {
                page,
                pageSize,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        })
    },

    /**
     * Create a response with metadata
     * @param {*} data - Response data
     * @param {Object} metadata - Metadata
     * @returns {Object} Response with metadata
     */
    withMetadata(data, metadata) {
        return this.success({
            data,
            metadata
        })
    },

    /**
     * Format a collection of items
     * @param {Array} items - Collection items
     * @param {string} name - Collection name
     * @returns {Object} Formatted collection
     */
    collection(items, name = 'items') {
        return this.success({
            [name]: items,
            count: items.length
        })
    }
}

module.exports = responseUtils