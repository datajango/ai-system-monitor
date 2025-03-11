'use strict'

const path = require('path')
const loggerService = require('./logger.service')
const filesystemService = require('./filesystem.service')
const errorService = require('./error.service')
const settingsService = require('./settings.service')
const processorService = require('./processor.service')
const llmService = require('./llm.service')
const reportService = require('./report.service')

/**
 * Service for analysis operations
 */
const analysisService = {
    /**
     * Get all analyses
     * @returns {Promise<Array>} List of analyses
     */
    async getAllAnalyses() {
        try {
            const analysisDir = settingsService.get('analysisOutputDir')
            const logger = loggerService.getLogger()

            // Ensure analysis directory exists
            await filesystemService.ensureDir(analysisDir)

            // Get directory entries
            const entries = await filesystemService.readDirWithStats(analysisDir)

            // Filter for analysis directories (matching snapshot IDs)
            const analysisDirs = entries.filter(entry =>
                entry.isDirectory && entry.name.startsWith('SystemState_')
            )

            // Get metadata for each analysis
            const analyses = await Promise.all(
                analysisDirs.map(async (dir) => {
                    try {
                        return await this.getAnalysisMetadata(dir.name)
                    } catch (error) {
                        logger.warn(`Failed to read metadata for analysis ${dir.name}`, { error })

                        // Provide basic info for analyses with missing or invalid metadata
                        return {
                            id: dir.name,
                            timestamp: dir.modified.toISOString(),
                            status: 'unknown'
                        }
                    }
                })
            )

            // Sort by timestamp, newest first
            return analyses.sort((a, b) =>
                new Date(b.timestamp) - new Date(a.timestamp)
            )
        } catch (error) {
            loggerService.error('Error getting analyses', error)
            throw new Error(`Failed to get analyses: ${error.message}`)
        }
    },

    /**
     * Get analysis metadata
     * @param {string} id - Analysis ID (same as snapshot ID)
     * @returns {Promise<Object>} Analysis metadata
     */
    async getAnalysisMetadata(id) {
        try {
            const analysisDir = settingsService.get('analysisOutputDir')
            const metadataPath = path.join(analysisDir, id, 'analysis_metadata.json')

            // Check if metadata file exists
            const exists = await filesystemService.exists(metadataPath)

            if (!exists) {
                return {
                    id,
                    timestamp: new Date().toISOString(),
                    status: 'unknown',
                    sections: []
                }
            }

            // Read metadata file
            const metadata = await filesystemService.readJSON(metadataPath)

            return {
                id,
                timestamp: metadata.timestamp,
                status: metadata.status || 'complete',
                model: metadata.model,
                sections: metadata.sections || [],
                duration: metadata.duration,
                completion: metadata.completion
            }
        } catch (error) {
            throw new Error(`Failed to get analysis metadata: ${error.message}`)
        }
    },

    /**
     * Get a specific analysis by ID
     * @param {string} id - Analysis ID (same as snapshot ID)
     * @returns {Promise<Object>} Analysis data
     */
    async getAnalysisById(id) {
        try {
            const analysisDir = settingsService.get('analysisOutputDir')
            const analysisPath = path.join(analysisDir, id)

            // Check if analysis directory exists
            const exists = await filesystemService.exists(analysisPath)

            if (!exists) {
                throw errorService.createNotFoundError('Analysis', id)
            }

            // Get analysis metadata
            const metadata = await this.getAnalysisMetadata(id)

            // Get list of analysis files
            const files = await filesystemService.readDirWithStats(analysisPath)
            const analysisFiles = files.filter(file =>
                file.isFile && file.name.endsWith('Analysis.json')
            )

            // Read each analysis file
            const data = {}
            for (const file of analysisFiles) {
                try {
                    // Extract section name by removing 'Analysis.json'
                    const section = path.basename(file.name, 'Analysis.json')
                    data[section] = await filesystemService.readJSON(file.path)
                } catch (error) {
                    loggerService.warn(`Error reading analysis file ${file.name}`, { error })
                    // Continue processing other files
                }
            }

            // Check if LLM interactions are available
            const llmDir = path.join(analysisPath, 'llm')
            if (await filesystemService.exists(llmDir)) {
                try {
                    // Read LLM interaction files
                    const llmFiles = await filesystemService.readDirWithStats(llmDir)
                    const llmJsonFiles = llmFiles.filter(file =>
                        file.isFile && file.name.endsWith('llm_interaction.json')
                    )

                    data.llmInteractions = {}

                    for (const file of llmJsonFiles) {
                        try {
                            // Extract section name by removing '_llm_interaction.json'
                            const section = path.basename(file.name, '_llm_interaction.json')
                            data.llmInteractions[section] = await filesystemService.readJSON(file.path)
                        } catch (error) {
                            loggerService.warn(`Error reading LLM file ${file.name}`, { error })
                            // Continue processing other files
                        }
                    }
                } catch (error) {
                    // LLM directory might exist but have issues, just log warning
                    loggerService.warn(`Error reading LLM interactions for ${id}`, { error })
                }
            }

            return {
                ...metadata,
                data
            }
        } catch (error) {
            if (error instanceof errorService.NotFoundError) {
                throw error
            }
            loggerService.error(`Error getting analysis ${id}`, error)
            throw new Error(`Failed to get analysis: ${error.message}`)
        }
    },

    /**
     * Create a new analysis
     * @param {string} snapshotId - Snapshot ID to analyze
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Analysis result
     */
    async createAnalysis(snapshotId, options = {}) {
        const logger = loggerService.getLogger()
        logger.info(`Starting analysis for snapshot ${snapshotId}`, { options })

        try {
            // Validate snapshot exists before proceeding
            const snapshotsDir = settingsService.get('snapshotsDir')
            const snapshotPath = path.join(snapshotsDir, snapshotId)

            if (!await filesystemService.exists(snapshotPath)) {
                throw errorService.createNotFoundError('Snapshot', snapshotId)
            }

            // Set up analysis directory
            const analysisDir = settingsService.get('analysisOutputDir')
            const analysisPath = path.join(analysisDir, snapshotId)

            await filesystemService.ensureDir(analysisPath)

            // Create llm directory for interactions
            const llmDir = path.join(analysisPath, 'llm')
            await filesystemService.ensureDir(llmDir)

            // Start timing
            const startTime = Date.now()

            // Create metadata
            const metadata = {
                id: snapshotId,
                timestamp: new Date().toISOString(),
                status: 'processing',
                model: options.model || settingsService.get('llmDefaultModel'),
                sections: options.sections || [],
                focus: options.focus || [],
                options
            }

            // Save initial metadata
            await filesystemService.writeJSON(
                path.join(analysisPath, 'analysis_metadata.json'),
                metadata
            )

            // Process the snapshot
            const analysis = await processorService.processSnapshot(snapshotId, options)

            // Save section analyses
            for (const [section, sectionData] of Object.entries(analysis.sections)) {
                await filesystemService.writeJSON(
                    path.join(analysisPath, `${section}Analysis.json`),
                    sectionData
                )
            }

            // Save LLM interactions if any
            if (analysis.llmInteractions) {
                for (const [section, interaction] of Object.entries(analysis.llmInteractions)) {
                    await filesystemService.writeJSON(
                        path.join(llmDir, `${section}_llm_interaction.json`),
                        interaction
                    )
                }
            }

            // Calculate duration
            const endTime = Date.now()
            const duration = endTime - startTime

            // Update metadata
            metadata.status = 'complete'
            metadata.sections = Object.keys(analysis.sections)
            metadata.duration = duration
            metadata.completion = new Date().toISOString()

            await filesystemService.writeJSON(
                path.join(analysisPath, 'analysis_metadata.json'),
                metadata
            )

            logger.info(`Analysis completed for snapshot ${snapshotId}`, {
                duration,
                sections: metadata.sections
            })

            return {
                success: true,
                message: 'Analysis completed successfully',
                id: snapshotId,
                duration,
                sections: metadata.sections
            }
        } catch (error) {
            logger.error(`Error analyzing snapshot ${snapshotId}`, error)

            // Try to update metadata to reflect error
            try {
                const analysisDir = settingsService.get('analysisOutputDir')
                const metadataPath = path.join(analysisDir, snapshotId, 'analysis_metadata.json')

                if (await filesystemService.exists(metadataPath)) {
                    const metadata = await filesystemService.readJSON(metadataPath)
                    metadata.status = 'error'
                    metadata.error = error.message
                    metadata.completion = new Date().toISOString()

                    await filesystemService.writeJSON(metadataPath, metadata)
                }
            } catch (metadataError) {
                // Just log this error, don't let it overshadow the original error
                logger.error('Error updating metadata after analysis failure', metadataError)
            }

            if (error instanceof errorService.NotFoundError) {
                throw error
            }
            throw new Error(`Failed to analyze snapshot: ${error.message}`)
        }
    },

    /**
     * Delete an analysis
     * @param {string} id - Analysis ID
     * @returns {Promise<Object>} Operation result
     */
    async deleteAnalysis(id) {
        try {
            const analysisDir = settingsService.get('analysisOutputDir')
            const analysisPath = path.join(analysisDir, id)

            // Check if analysis exists
            const exists = await filesystemService.exists(analysisPath)

            if (!exists) {
                throw errorService.createNotFoundError('Analysis', id)
            }

            // Delete analysis directory
            await filesystemService.deleteDir(analysisPath, true)

            return {
                success: true,
                message: `Analysis ${id} deleted successfully`
            }
        } catch (error) {
            if (error instanceof errorService.NotFoundError) {
                throw error
            }
            loggerService.error(`Error deleting analysis ${id}`, error)
            throw new Error(`Failed to delete analysis: ${error.message}`)
        }
    },

    /**
     * Get detailed results for an analysis
     * @param {string} id - Analysis ID
     * @returns {Promise<Object>} Detailed analysis results
     */
    async getAnalysisResults(id) {
        try {
            // Get the basic analysis
            const analysis = await this.getAnalysisById(id)

            // Generate a formatted report
            const report = reportService.formatAnalysisReport(analysis)

            return {
                ...analysis,
                report
            }
        } catch (error) {
            if (error instanceof errorService.NotFoundError) {
                throw error
            }
            loggerService.error(`Error getting analysis results ${id}`, error)
            throw new Error(`Failed to get analysis results: ${error.message}`)
        }
    },

    /**
     * Compare analyses
     * @param {string} baselineId - Baseline analysis ID
     * @param {string} currentId - Current analysis ID
     * @param {Object} options - Comparison options
     * @returns {Promise<Object>} Comparison results
     */
    async compareAnalyses(baselineId, currentId, options = {}) {
        try {
            // Get both analyses
            const baseline = await this.getAnalysisById(baselineId)
            const current = await this.getAnalysisById(currentId)

            // Generate comparison report
            const comparison = reportService.compareAnalysisReports(baseline, current, options)

            return {
                baselineId,
                currentId,
                baselineTimestamp: baseline.timestamp,
                currentTimestamp: current.timestamp,
                comparisonDate: new Date().toISOString(),
                ...comparison
            }
        } catch (error) {
            if (error instanceof errorService.NotFoundError) {
                throw error
            }
            loggerService.error(`Error comparing analyses ${baselineId} and ${currentId}`, error)
            throw new Error(`Failed to compare analyses: ${error.message}`)
        }
    }
}

module.exports = analysisService