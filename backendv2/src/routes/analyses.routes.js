'use strict'

const analysesController = require('../controllers/analyses.controller')

/**
 * Routes for analysis operations
 * @param {FastifyInstance} fastify - Fastify instance
 * @param {Object} opts - Plugin options
 */
module.exports = async function (fastify, opts) {
    // Get all analyses
    fastify.get('/', {
        schema: {
            description: 'Get all available analyses',
            tags: ['analyses'],
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            timestamp: { type: 'string', format: 'date-time' },
                            status: { type: 'string' },
                            model: { type: 'string' },
                            sections: {
                                type: 'array',
                                items: { type: 'string' }
                            },
                            duration: { type: 'number' },
                            completion: { type: 'string', format: 'date-time' }
                        }
                    }
                }
            }
        }
    }, analysesController.getAllAnalyses)

    // Get a specific analysis by ID
    fastify.get('/:id', {
        schema: {
            description: 'Get analysis by ID',
            tags: ['analyses'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        status: { type: 'string' },
                        model: { type: 'string' },
                        sections: {
                            type: 'array',
                            items: { type: 'string' }
                        },
                        data: { type: 'object' }
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
    }, analysesController.getAnalysisById)

    // Create a new analysis
    fastify.post('/', {
        schema: {
            description: 'Create a new analysis for a snapshot',
            tags: ['analyses'],
            body: {
                type: 'object',
                required: ['snapshotId'],
                properties: {
                    snapshotId: { type: 'string' },
                    model: { type: 'string' },
                    sections: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    focus: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    depth: {
                        type: 'string',
                        enum: ['basic', 'standard', 'detailed']
                    }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        id: { type: 'string' },
                        duration: { type: 'number' },
                        sections: {
                            type: 'array',
                            items: { type: 'string' }
                        }
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
    }, analysesController.createAnalysis)

    // Delete an analysis
    fastify.delete('/:id', {
        schema: {
            description: 'Delete an analysis',
            tags: ['analyses'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
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
    }, analysesController.deleteAnalysis)

    // Get detailed results for an analysis
    fastify.get('/:id/results', {
        schema: {
            description: 'Get detailed results for an analysis',
            tags: ['analyses'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        report: { type: 'object' }
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
    }, analysesController.getAnalysisResults)

    // Compare analyses
    fastify.post('/compare', {
        schema: {
            description: 'Compare two analyses',
            tags: ['analyses'],
            body: {
                type: 'object',
                required: ['baselineId', 'currentId'],
                properties: {
                    baselineId: { type: 'string' },
                    currentId: { type: 'string' },
                    sections: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        baselineId: { type: 'string' },
                        currentId: { type: 'string' },
                        baselineTimestamp: { type: 'string', format: 'date-time' },
                        currentTimestamp: { type: 'string', format: 'date-time' },
                        comparisonDate: { type: 'string', format: 'date-time' },
                        sections: { type: 'object' },
                        changes: { type: 'object' },
                        summary: { type: 'object' }
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
    }, analysesController.compareAnalyses)
}