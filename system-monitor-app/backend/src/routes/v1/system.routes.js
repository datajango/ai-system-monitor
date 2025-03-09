// backend/src/routes/v1/system.routes.js
'use strict'

const systemController = require('../../controllers/system.controller')

module.exports = async function (fastify, opts) {
    // Get all system snapshots
    fastify.get('/snapshots', {
        schema: {
            description: 'Get all available system snapshots',
            tags: ['system'],
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            timestamp: { type: 'string' },
                            description: { type: 'string' },
                            path: { type: 'string' }
                        }
                    }
                }
            }
        }
    }, systemController.getAllSnapshots)

    // Get a specific system snapshot by id
    fastify.get('/snapshots/:id', {
        schema: {
            description: 'Get system snapshot by ID',
            tags: ['system'],
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
                        timestamp: { type: 'string' },
                        description: { type: 'string' },
                        data: { type: 'object' }
                    }
                }
            }
        }
    }, systemController.getSnapshotById)

    // Get analysis for a specific snapshot
    fastify.get('/analysis/:id', {
        schema: {
            description: 'Get analysis for a system snapshot',
            tags: ['system'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' }
                }
            }
        }
    }, systemController.getAnalysisById)

    // Run a new system snapshot collection
    fastify.post('/collect', {
        schema: {
            description: 'Run a new system snapshot collection',
            tags: ['system'],
            body: {
                type: 'object',
                properties: {
                    outputPath: { type: 'string' },
                    description: { type: 'string' },
                    compareWithLatest: { type: 'boolean' }
                }
            }
        }
    }, systemController.runCollection)

    // Run analysis on a snapshot
    fastify.post('/analyze/:id', {
        schema: {
            description: 'Run analysis on a system snapshot',
            tags: ['system'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    model: { type: 'string' },
                    focus: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                }
            }
        }
    }, systemController.runAnalysis)

    // Compare two snapshots
    fastify.post('/compare', {
        schema: {
            description: 'Compare two system snapshots',
            tags: ['system'],
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
            }
        }
    }, systemController.compareSnapshots)
}