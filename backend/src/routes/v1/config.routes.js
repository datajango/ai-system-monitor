// backend/src/routes/v1/config.routes.js
'use strict'

const configController = require('../../controllers/config.controller')

module.exports = async function (fastify, opts) {
    // Get current configuration
    fastify.get('/', {
        schema: {
            description: 'Get current analyzer configuration',
            tags: ['config'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        llmServerUrl: { type: 'string' },
                        llmModel: { type: 'string' },
                        llmMaxTokens: { type: 'integer' },
                        llmTemperature: { type: 'number' },
                        outputDir: { type: 'string' }
                    }
                }
            }
        }
    }, configController.getConfig)

    // Update configuration
    fastify.put('/', {
        schema: {
            description: 'Update analyzer configuration',
            tags: ['config'],
            body: {
                type: 'object',
                properties: {
                    llmServerUrl: { type: 'string' },
                    llmModel: { type: 'string' },
                    llmMaxTokens: { type: 'integer' },
                    llmTemperature: { type: 'number' },
                    outputDir: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        config: {
                            type: 'object',
                            properties: {
                                llmServerUrl: { type: 'string' },
                                llmModel: { type: 'string' },
                                llmMaxTokens: { type: 'integer' },
                                llmTemperature: { type: 'number' },
                                outputDir: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, configController.updateConfig)

    // Get available LLM models
    fastify.get('/models', {
        schema: {
            description: 'Get available LLM models',
            tags: ['config'],
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
    }, configController.getAvailableModels)

    // Test LLM connection
    fastify.post('/test-llm-connection', {
        schema: {
            description: 'Test LLM server connection',
            tags: ['config'],
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
                        responseTime: { type: 'number' }
                    }
                }
            }
        }
    }, configController.testLlmConnection)
}