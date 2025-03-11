'use strict'

const systemController = require('../controllers/system.controller')

/**
 * System routes
 * @param {FastifyInstance} fastify - Fastify instance
 * @param {Object} opts - Plugin options
 */
module.exports = async function (fastify, opts) {
    // Get system status
    fastify.get('/status', {
        schema: {
            description: 'Get system status',
            tags: ['system'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        uptime: { type: 'number' },
                        environment: { type: 'string' },
                        version: { type: 'string' },
                        process: { type: 'object' },
                        system: { type: 'object' }
                    }
                }
            }
        }
    }, systemController.getStatus)

    // Get system health
    fastify.get('/health', {
        schema: {
            description: 'Get system health check',
            tags: ['system'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        uptime: { type: 'number' },
                        memoryUsage: { type: 'string' }
                    }
                }
            }
        }
    }, systemController.getHealth)

    // Get detailed component status
    fastify.get('/components', {
        schema: {
            description: 'Get detailed status of all system components',
            tags: ['system'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        components: { type: 'object' }
                    }
                }
            }
        }
    }, systemController.getComponentsStatus)

    // Restart the system
    fastify.post('/restart', {
        schema: {
            description: 'Restart the system',
            tags: ['system'],
            response: {
                202: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        status: { type: 'string' }
                    }
                }
            }
        }
    }, systemController.restartSystem)

    // Pause background operations
    fastify.post('/pause', {
        schema: {
            description: 'Pause background operations',
            tags: ['system'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        state: { type: 'string' },
                        tasks: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    success: { type: 'boolean' }
                                }
                            }
                        }
                    }
                }
            }
        }
    }, systemController.pauseSystem)

    // Resume background operations
    fastify.post('/resume', {
        schema: {
            description: 'Resume background operations',
            tags: ['system'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        state: { type: 'string' },
                        tasks: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    success: { type: 'boolean' }
                                }
                            }
                        }
                    }
                }
            }
        }
    }, systemController.resumeSystem)

    // Get system state
    fastify.get('/state', {
        schema: {
            description: 'Get system state',
            tags: ['system'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        state: { type: 'string' },
                        tasksRegistered: { type: 'number' },
                        tasksRunning: { type: 'number' },
                        runningTasks: {
                            type: 'array',
                            items: { type: 'string' }
                        }
                    }
                }
            }
        }
    }, systemController.getSystemState)

    // Terminate the system
    fastify.post('/terminate', {
        schema: {
            description: 'Terminate the system',
            tags: ['system'],
            response: {
                202: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        status: { type: 'string' }
                    }
                }
            }
        }
    }, systemController.terminateSystem)

    // Check connection status
    fastify.get('/connections', {
        schema: {
            description: 'Check connection status',
            tags: ['system'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        llm: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                message: { type: 'string' },
                                responseTime: { type: 'number' }
                            }
                        },
                        storage: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                message: { type: 'string' },
                                directories: { type: 'object' }
                            }
                        },
                        overall: { type: 'string' }
                    }
                }
            }
        }
    }, systemController.checkConnections)
}