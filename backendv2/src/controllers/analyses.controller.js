'use strict'

const analysisService = require('../services/analysis.service')
const errorService = require('../services/error.service')
const loggerService = require('../services/logger.service')

/**
 * Controller for analysis operations
 */
const analysesController = {
    /**
     * Get all analyses
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Array>} List of analyses
     */
    async getAllAnalyses(request, reply) {
        try {
            const analyses = await analysisService.getAllAnalyses()
            return reply.code(200).send(analyses)
        } catch (error) {
            loggerService.error('Error getting all analyses', error)
            return reply.code(500).send({
                error: 'Failed to fetch analyses',
                message: error.message
            })
        }
    },

    /**
     * Get a specific analysis by ID
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Analysis data
     */
    async getAnalysisById(request, reply) {
        try {
            const { id } = request.params
            const analysis = await analysisService.getAnalysisById(id)
            return reply.code(200).send(analysis)
        } catch (error) {
            loggerService.error(`Error getting analysis ${request.params.id}`, error)

            if (error instanceof errorService.NotFoundError) {
                return reply.code(404).send({
                    error: 'Analysis not found',
                    message: error.message
                })
            }

            return reply.code(500).send({
                error: 'Failed to fetch analysis',
                message: error.message
            })
        }
    },

    /**
     * Create a new analysis
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Created analysis
     */
    async createAnalysis(request, reply) {
        try {
            const { snapshotId, model, sections, focus, depth } = request.body || {}

            if (!snapshotId) {
                return reply.code(400).send({
                    error: 'Bad Request',
                    message: 'snapshotId is required'
                })
            }

            // Create analysis
            const result = await analysisService.createAnalysis(snapshotId, {
                model,
                sections,
                focus,
                depth
            })

            return reply.code(201).send(result)
        } catch (error) {
            loggerService.error('Error creating analysis', error)

            if (error instanceof errorService.NotFoundError) {
                return reply.code(404).send({
                    error: 'Snapshot not found',
                    message: error.message
                })
            }

            return reply.code(500).send({
                error: 'Failed to create analysis',
                message: error.message
            })
        }
    },

    /**
     * Delete an analysis
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Deletion result
     */
    async deleteAnalysis(request, reply) {
        try {
            const { id } = request.params
            const result = await analysisService.deleteAnalysis(id)

            return reply.code(200).send(result)
        } catch (error) {
            loggerService.error(`Error deleting analysis ${request.params.id}`, error)

            if (error instanceof errorService.NotFoundError) {
                return reply.code(404).send({
                    error: 'Analysis not found',
                    message: error.message
                })
            }

            return reply.code(500).send({
                error: 'Failed to delete analysis',
                message: error.message
            })
        }
    },

    /**
     * Get detailed results for an analysis
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Analysis results
     */
    async getAnalysisResults(request, reply) {
        try {
            const { id } = request.params
            const results = await analysisService.getAnalysisResults(id)

            return reply.code(200).send(results)
        } catch (error) {
            loggerService.error(`Error getting analysis results for ${request.params.id}`, error)

            if (error instanceof errorService.NotFoundError) {
                return reply.code(404).send({
                    error: 'Analysis not found',
                    message: error.message
                })
            }

            return reply.code(500).send({
                error: 'Failed to get analysis results',
                message: error.message
            })
        }
    },

    /**
     * Compare analyses
     * @param {FastifyRequest} request - Request object
     * @param {FastifyReply} reply - Reply object
     * @returns {Promise<Object>} Comparison results
     */
    async compareAnalyses(request, reply) {
        try {
            const { baselineId, currentId, sections } = request.body || {}

            if (!baselineId || !currentId) {
                return reply.code(400).send({
                    error: 'Bad Request',
                    message: 'baselineId and currentId are required'
                })
            }

            // Compare analyses
            const results = await analysisService.compareAnalyses(baselineId, currentId, {
                sections
            })

            return reply.code(200).send(results)
        } catch (error) {
            loggerService.error('Error comparing analyses', error)

            if (error instanceof errorService.NotFoundError) {
                return reply.code(404).send({
                    error: 'Analysis not found',
                    message: error.message
                })
            }

            return reply.code(500).send({
                error: 'Failed to compare analyses',
                message: error.message
            })
        }
    }
}

module.exports = analysesController