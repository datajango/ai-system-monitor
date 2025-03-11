'use strict'

const modelsController = require('../controllers/models.controller')

/**
 * Routes for model operations
 * @param {FastifyInstance} fastify - Fastify instance
 * @param {Object} opts - Plugin options
 */
module.exports = async function (fastify, opts) {
    // Get all available models
    fastify.get('/', {
        schema: {
            description: 'Get all available models',
            tags: ['models'],
            querystring: {
                type: 'object',
                properties: {
                    refresh: {
                        type: 'string',
                        enum: ['true', 'false']
                    }
                }
            },
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            created: { type: 'string', format: 'date-time' },
                            description: { type: 'string' }
                        }
                    }
                }
            }
        }
    }, modelsController.getAllModels)

    // Get the current model
    fastify.get('/current', {
        schema: {
            description: 'Get the current model',
            tags: ['models'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        isCurrent: { type: 'boolean' },
                        temperature: { type: 'number' },
                        maxTokens: { type: 'number' }
                    }
                }
            }
        }
    }, modelsController.getCurrentModel)

    // Set the current model
    fastify.put('/current', {
        schema: {
            description: 'Set the current model',
            tags: ['models'],
            body: {
                type: 'object',
                required: ['modelId'],
                properties: {
                    modelId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        isCurrent: { type: 'boolean' },
                        temperature: { type: 'number' },
                        maxTokens: { type: 'number' }
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
    }, modelsController.setCurrentModel)

    // Update model parameters
    fastify.patch('/params', {
        schema: {
            description: 'Update model parameters',
            tags: ['models'],
            body: {
                type: 'object',
                properties: {
                    temperature: { type: 'number' },
                    maxTokens: { type: 'number' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        isCurrent: { type: 'boolean' },
                        temperature: { type: 'number' },
                        maxTokens: { type: 'number' }
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
    }, modelsController.updateModelParams)

    // Test model connection
    fastify.post('/test', {
        schema: {
            description: 'Test model connection',
            tags: ['models'],
            body: {
                type: 'object',
                properties: {
                    modelId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        responseTime: { type: 'number' },
                        model: { type: 'string' },
                        content: { type: 'string' }
                    }
                }
            }
        }
    }, modelsController.testModel)

    // Search for models
    fastify.get('/search', {
        schema: {
            description: 'Search for models',
            tags: ['models'],
            querystring: {
                type: 'object',
                properties: {
                    query: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            description: { type: 'string' }
                        }
                    }
                }
            }
        }
    }, modelsController.searchModels)

    // Get model usage statistics
    fastify.get('/stats', {
        schema: {
            description: 'Get model usage statistics',
            tags: ['models'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        totalRequests: { type: 'number' },
                        tokenUsage: {
                            type: 'object',
                            properties: {
                                total: { type: 'number' },
                                prompt: { type: 'number' },
                                completion: { type: 'number' }
                            }
                        },
                        modelUsage: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    model: { type: 'string' },
                                    requests: { type: 'number' },
                                    tokens: { type: 'number' }
                                }
                            }
                        },
                        averageLatency: { type: 'number' },
                        errorRate: { type: 'number' }
                    }
                }
            }
        }
    }, modelsController.getModelUsageStats)

    // Test LLM connection
    fastify.post('/connection/test', {
        schema: {
            description: 'Test LLM server connection',
            tags: ['models'],
            body: {
                type: 'object',
                properties: {
                    serverUrl: { type: 'string' },
                    model: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        responseTime: { type: 'number' },
                        serverUrl: { type: 'string' },
                        model: { type: 'string' }
                    }
                }
            }
        }
    }, modelsController.testLlmConnection)

    // Refresh model cache
    fastify.post('/refresh', {
        schema: {
            description: 'Refresh model cache',
            tags: ['models'],
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            description: { type: 'string' }
                        }
                    }
                }
            }
        }
    }, modelsController.refreshModelCache)
}