'use strict'

/**
 * Application constants
 */
const constants = {
    /**
     * Application version
     */
    VERSION: '1.0.0',

    /**
     * API version
     */
    API_VERSION: 'v1',

    /**
     * Default port
     */
    DEFAULT_PORT: 3000,

    /**
     * Default LLM settings
     */
    LLM: {
        DEFAULT_SERVER_URL: 'http://localhost:1234/v1',
        DEFAULT_MODEL: 'gemma-2-9b-it',
        DEFAULT_MAX_TOKENS: 32768,
        DEFAULT_TEMPERATURE: 0.7,
        DEFAULT_TIMEOUT: 60000 // 60 seconds
    },

    /**
     * Log levels
     */
    LOG_LEVELS: {
        DEBUG: 'debug',
        INFO: 'info',
        WARN: 'warn',
        ERROR: 'error',
        FATAL: 'fatal'
    },

    /**
     * Log formats
     */
    LOG_FORMATS: {
        PRETTY: 'pretty',
        JSON: 'json'
    },

    /**
     * Cache settings
     */
    CACHE: {
        DEFAULT_DURATION: 3600, // 1 hour in seconds
        MODEL_TTL: 300 // 5 minutes in seconds
    },

    /**
     * File size limits
     */
    FILE_SIZE_LIMITS: {
        DEFAULT: '100mb',
        SMALL: '10mb',
        LARGE: '1gb'
    },

    /**
     * HTTP status codes
     */
    HTTP_STATUS: {
        OK: 200,
        CREATED: 201,
        ACCEPTED: 202,
        NO_CONTENT: 204,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        INTERNAL_SERVER_ERROR: 500,
        SERVICE_UNAVAILABLE: 503
    },

    /**
     * Error codes
     */
    ERROR_CODES: {
        INTERNAL_ERROR: 'INTERNAL_ERROR',
        NOT_FOUND: 'NOT_FOUND',
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        FORBIDDEN: 'FORBIDDEN',
        UNAUTHORIZED: 'UNAUTHORIZED',
        BAD_REQUEST: 'BAD_REQUEST',
        CONFLICT: 'CONFLICT',
        SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
    },

    /**
     * Snapshot related constants
     */
    SNAPSHOT: {
        ID_PREFIX: 'SystemState_',
        DEFAULT_FILE_ENCODING: 'utf8',
        VALID_SECTIONS: [
            'System',
            'Network',
            'InstalledPrograms',
            'Path',
            'DiskSpace',
            'Performance',
            'Browsers',
            'Drivers',
            'Environment',
            'Fonts',
            'PerformanceData',
            'PythonInstallations',
            'RegistrySettings',
            'RunningServices',
            'ScheduledTasks',
            'StartupPrograms',
            'WindowsFeatures',
            'WindowsUpdates'
        ]
    },

    /**
     * Analysis related constants
     */
    ANALYSIS: {
        SEVERITY_LEVELS: [
            'critical',
            'high',
            'medium',
            'low',
            'info',
            'good'
        ],
        DEPTH_LEVELS: [
            'basic',
            'standard',
            'detailed'
        ],
        FOCUS_AREAS: [
            'System',
            'Performance',
            'Network',
            'Security',
            'Storage',
            'Applications',
            'Configuration'
        ]
    },

    /**
     * System state constants
     */
    SYSTEM_STATE: {
        RUNNING: 'running',
        PAUSED: 'paused',
        SHUTTING_DOWN: 'shutting_down'
    }
}

module.exports = constants