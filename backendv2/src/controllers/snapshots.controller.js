'use strict'

const snapshotService = require('../services/snapshot.service')
const errorService = require('../services/error.service')
const loggerService = require('../services/logger.service')

/**
 * Controller for snapshot operations
 */
const snapshotsController = {
    /**
     * Get all snapshots
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Array>} List of snapshots
     */
    async getAllSnapshots(request, reply) {
        try {
            const snapshots = await snapshotService.getAllSnapshots()
            return reply.code(200).send(snapshots)
        } catch (error) {
            loggerService.error('Error getting all snapshots', error)
            return reply.code(500).send({
                error: 'Failed to fetch snapshots',
                message: error.message
            })
        }
    },

    /**
     * Get a specific snapshot by ID
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Snapshot data
     */
    async getSnapshotById(request, reply) {
        try {
            const { id } = request.params
            const snapshot = await snapshotService.getSnapshotById(id)
            return reply.code(200).send(snapshot)
        } catch (error) {
            loggerService.error(`Error getting snapshot ${request.params.id}`, error)

            if (error instanceof errorService.NotFoundError) {
                return reply.code(404).send({
                    error: 'Snapshot not found',
                    message: error.message
                })
            }

            return reply.code(500).send({
                error: 'Failed to fetch snapshot',
                message: error.message
            })
        }
    },

    /**
     * Create a new snapshot
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Created snapshot
     */
    async createSnapshot(request, reply) {
        try {
            const { description, tags } = request.body || {}

            // Create snapshot
            const result = await snapshotService.createSnapshot({ description, tags })

            return reply.code(201).send(result)
        } catch (error) {
            loggerService.error('Error creating snapshot', error)
            return reply.code(500).send({
                error: 'Failed to create snapshot',
                message: error.message
            })
        }
    },

    /**
     * Delete a snapshot
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Deletion result
     */
    async deleteSnapshot(request, reply) {
        try {
            const { id } = request.params
            const result = await snapshotService.deleteSnapshot(id)

            return reply.code(200).send(result)
        } catch (error) {
            loggerService.error(`Error deleting snapshot ${request.params.id}`, error)

            if (error instanceof errorService.NotFoundError) {
                return reply.code(404).send({
                    error: 'Snapshot not found',
                    message: error.message
                })
            }

            return reply.code(500).send({
                error: 'Failed to delete snapshot',
                message: error.message
            })
        }
    },

    /**
     * Get files in a snapshot
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Array>} List of files
     */
    async getSnapshotFiles(request, reply) {
        try {
            const { id } = request.params
            const files = await snapshotService.getSnapshotFiles(id)

            return reply.code(200).send(files)
        } catch (error) {
            loggerService.error(`Error getting files for snapshot ${request.params.id}`, error)

            if (error instanceof errorService.NotFoundError) {
                return reply.code(404).send({
                    error: 'Snapshot not found',
                    message: error.message
                })
            }

            return reply.code(500).send({
                error: 'Failed to fetch snapshot files',
                message: error.message
            })
        }
    },

    /**
     * Get a specific file from a snapshot
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} File content
     */
    async getSnapshotFile(request, reply) {
        try {
            const { id, filename } = request.params
            const file = await snapshotService.getSnapshotFile(id, filename)

            // Manually construct and serialize the response
            const response = {
                fileName: file.fileName,
                content: file.content,
                type: file.type
            }

            //loggerService.info(`Response: ${JSON.stringify(response)}`)

            reply.code(200).type("application/json").send(response);

        } catch (error) {
            loggerService.error(`Error getting file ${request.params.filename} from snapshot ${request.params.id}`, error)

            if (error instanceof errorService.NotFoundError) {
                return reply.code(404).send({
                    error: error.entityType === 'Snapshot' ? 'Snapshot not found' : 'File not found',
                    message: error.message
                })
            }

            return reply.code(500).send({
                error: 'Failed to fetch file',
                message: error.message
            })
        }
    }
}

module.exports = snapshotsController