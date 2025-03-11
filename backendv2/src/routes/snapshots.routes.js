'use strict'

const snapshotsController = require('../controllers/snapshots.controller')

/**
 * Routes for snapshot operations
 * @param {FastifyInstance} fastify - Fastify instance
 * @param {Object} opts - Plugin options
 */
module.exports = async function (fastify, opts) {
    // Get all snapshots
    fastify.get('/', {
        schema: {
            description: 'Get all available system snapshots',
            tags: ['snapshots'],
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            timestamp: { type: 'string', format: 'date-time' },
                            description: { type: 'string' },
                            status: { type: 'string' },
                            tags: {
                                type: 'array',
                                items: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, snapshotsController.getAllSnapshots)

    // Get a specific snapshot by ID
    fastify.get('/:id', {
        schema: {
            description: 'Get system snapshot by ID',
            tags: ['snapshots'],
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
                        description: { type: 'string' },
                        status: { type: 'string' },
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
    }, snapshotsController.getSnapshotById)

    // Create a new snapshot
    fastify.post('/', {
        schema: {
            description: 'Create a new system snapshot',
            tags: ['snapshots'],
            body: {
                type: 'object',
                properties: {
                    description: { type: 'string' },
                    tags: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        snapshot: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                timestamp: { type: 'string', format: 'date-time' },
                                description: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, snapshotsController.createSnapshot)

    // Delete a snapshot
    fastify.delete('/:id', {
        schema: {
            description: 'Delete a system snapshot',
            tags: ['snapshots'],
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
    }, snapshotsController.deleteSnapshot)

    // Get files in a snapshot
    fastify.get('/:id/files', {
        schema: {
            description: 'Get all files in a system snapshot',
            tags: ['snapshots'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            size: { type: 'number' },
                            modified: { type: 'string', format: 'date-time' },
                            created: { type: 'string', format: 'date-time' },
                            section: { type: 'string' }
                        }
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
    }, snapshotsController.getSnapshotFiles)

    // Get a specific file from a snapshot
    fastify.get('/:id/files/:filename', {
        schema: {
            description: 'Get a specific file from a system snapshot',
            tags: ['snapshots'],
            params: {
                type: 'object',
                required: ['id', 'filename'],
                properties: {
                    id: { type: 'string' },
                    filename: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        fileName: { type: 'string' },
                        content: {
                            type: 'object',
                            additionalProperties: true
                        },
                        type: { type: 'string', enum: ['json', 'text'] }
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
    }, snapshotsController.getSnapshotFile)
}