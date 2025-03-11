'use strict'

const settingsService = require('../services/settings.service')

/**
 * CORS configuration
 * @returns {Object} CORS configuration object
 */
function corsConfig() {
    // Get allowed origins from settings
    const corsAllowedOrigins = settingsService.get('corsAllowedOrigins') || [
        'http://localhost:5173',
        'http://localhost:3000'
    ]

    // Get environment
    const environment = settingsService.get('environment')

    // In development, allow all origins
    const origin = environment === 'development'
        ? true
        : corsAllowedOrigins

    return {
        origin,
        methods: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
        credentials: true,
        maxAge: 86400, // 24 hours
        preflightContinue: false,
        optionsSuccessStatus: 204
    }
}

module.exports = { corsConfig }