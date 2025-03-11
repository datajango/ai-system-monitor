'use strict'

const settingsController = require('../controllers/settings.controller')

/**
 * Routes for settings operations
 * @param {FastifyInstance} fastify - Fastify instance
 * @param {Object} opts - Plugin options
 */
module.exports = async function (fastify, opts) {
    // Get all settings
    fastify.get('/', {
        schema: {
            description: 'Get all application settings',
            tags: ['settings'],
            response: {
                200: {
                    type: 'object',
                    additionalProperties: true
                }
            }
        }
    }, settingsController.getAllSettings)

    // Get a specific setting
    fastify.get('/:key', {
        schema: {
            description: 'Get a specific setting by key',
            tags: ['settings'],
            params: {
                type: 'object',
                required: ['key'],
                properties: {
                    key: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        key: { type: 'string' },
                        value: { type: ['string', 'number', 'boolean', 'array', 'object'] }
                    }
                },
                404: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, settingsController.getSetting)

    // Update a specific setting
    fastify.put('/:key', {
        schema: {
            description: 'Update a specific setting',
            tags: ['settings'],
            params: {
                type: 'object',
                required: ['key'],
                properties: {
                    key: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                required: ['value'],
                properties: {
                    value: { type: ['string', 'number', 'boolean', 'array', 'object'] }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        key: { type: 'string' },
                        value: { type: ['string', 'number', 'boolean', 'array', 'object'] },
                        updated: { type: 'boolean' }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' }
                    }
                },
                404: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, settingsController.updateSetting)

    // Update multiple settings
    fastify.put('/', {
        schema: {
            description: 'Update multiple settings',
            tags: ['settings'],
            body: {
                type: 'object',
                additionalProperties: true
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        results: {
                            type: 'object',
                            properties: {
                                updated: {
                                    type: 'array',
                                    items: { type: 'string' }
                                },
                                invalid: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            key: { type: 'string' },
                                            reason: { type: 'string' }
                                        }
                                    }
                                },
                                unknown: {
                                    type: 'array',
                                    items: { type: 'string' }
                                }
                            }
                        },
                        settings: { type: 'object', additionalProperties: true }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, settingsController.updateBatchSettings)

    // Reload settings from .env
    fastify.post('/reload', {
        schema: {
            description: 'Reload settings from .env file',
            tags: ['settings'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        settings: { type: 'object', additionalProperties: true }
                    }
                }
            }
        }
    }, settingsController.reloadSettings)

    // Validate settings
    fastify.get('/validate', {
        schema: {
            description: 'Validate settings',
            tags: ['settings'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        valid: { type: 'boolean' },
                        issues: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    key: { type: 'string' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    }, settingsController.validateSettings)
}