// backend/src/controllers/system.controller.js
'use strict'

const systemService = require('../services/system.service')

// Controller functions for system operations
const systemController = {
    // Get all available system snapshots
    async getAllSnapshots(request, reply) {
        try {
            const snapshots = await systemService.getAllSnapshots()
            return reply.code(200).send(snapshots)
        } catch (err) {
            request.log.error(err)
            return reply.code(500).send({ error: 'Failed to fetch snapshots', message: err.message })
        }
    },

    // Get a specific snapshot by ID
    async getSnapshotById(request, reply) {
        try {
            const { id } = request.params
            const snapshot = await systemService.getSnapshotById(id)

            if (!snapshot) {
                return reply.code(404).send({ error: 'Snapshot not found' })
            }

            return reply.code(200).send(snapshot)
        } catch (err) {
            request.log.error(err)
            return reply.code(500).send({ error: 'Failed to fetch snapshot', message: err.message })
        }
    },

    // Get analysis for a specific snapshot
    async getAnalysisById(request, reply) {
        try {
            const { id } = request.params
            const analysis = await systemService.getAnalysisById(id)

            if (!analysis) {
                return reply.code(404).send({ error: 'Analysis not found' })
            }

            return reply.code(200).send(analysis)
        } catch (err) {
            request.log.error(err)
            return reply.code(500).send({ error: 'Failed to fetch analysis', message: err.message })
        }
    },

    // Run a new system snapshot collection
    async runCollection(request, reply) {
        try {
            const { outputPath, description, compareWithLatest } = request.body

            // Start collection process
            const result = await systemService.runCollection({
                outputPath,
                description,
                compareWithLatest
            })

            return reply.code(200).send(result)
        } catch (err) {
            request.log.error(err)
            return reply.code(500).send({ error: 'Failed to run collection', message: err.message })
        }
    },

    // Run analysis on a snapshot
    async runAnalysis(request, reply) {
        try {
            const { id } = request.params
            const { model, focus } = request.body

            // Start analysis process
            const result = await systemService.runAnalysis(id, { model, focus })

            return reply.code(200).send(result)
        } catch (err) {
            request.log.error(err)
            return reply.code(500).send({ error: 'Failed to run analysis', message: err.message })
        }
    },

    // Compare two snapshots
    async compareSnapshots(request, reply) {
        try {
            const { baselineId, currentId, sections } = request.body

            // Run comparison
            const result = await systemService.compareSnapshots(baselineId, currentId, sections)

            return reply.code(200).send(result)
        } catch (err) {
            request.log.error(err)
            return reply.code(500).send({ error: 'Failed to compare snapshots', message: err.message })
        }
    }
}

module.exports = systemController