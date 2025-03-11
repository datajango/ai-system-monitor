'use strict'

const path = require('path')
const loggerService = require('./logger.service')
const filesystemService = require('./filesystem.service')
const settingsService = require('./settings.service')
const llmService = require('./llm.service')

/**
 * Service for processing and analyzing snapshot data
 */
const processorService = {
    /**
     * Process a snapshot for analysis
     * @param {string} snapshotId - Snapshot ID
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing results
     */
    async processSnapshot(snapshotId, options = {}) {
        const logger = loggerService.getLogger()
        logger.info(`Processing snapshot ${snapshotId}`, { options })

        try {
            // Extract options
            const {
                model = settingsService.get('llmDefaultModel'),
                focus = [],
                sections = [],
                depth = 'standard'  // 'basic', 'standard', or 'detailed'
            } = options

            // Read snapshot data
            const snapshotsDir = settingsService.get('snapshotsDir')
            const snapshotPath = path.join(snapshotsDir, snapshotId)

            // Read index.json or find all json files
            let snapshotFiles = []
            const indexPath = path.join(snapshotPath, 'index.json')

            if (await filesystemService.exists(indexPath)) {
                const index = await filesystemService.readJSON(indexPath)
                snapshotFiles = index.files || []
            } else {
                const files = await filesystemService.readDirWithStats(snapshotPath)
                snapshotFiles = files
                    .filter(file => file.isFile && file.name.endsWith('.json') && file.name !== 'metadata.json')
                    .map(file => file.name)
            }

            // Determine sections to analyze
            let sectionsToAnalyze = []

            if (sections && sections.length > 0) {
                // If specific sections are requested
                sectionsToAnalyze = sections
            } else if (focus && focus.length > 0) {
                // If focus areas are provided, filter sections
                sectionsToAnalyze = this.getSectionsForFocus(focus, snapshotFiles)
            } else {
                // Default to all sections except metadata and index
                sectionsToAnalyze = snapshotFiles
                    .filter(file => file !== 'metadata.json' && file !== 'index.json')
                    .map(file => path.basename(file, '.json'))
            }

            // Load data for each section
            const sectionData = {}
            for (const section of sectionsToAnalyze) {
                const sectionFile = `${section}.json`
                const sectionPath = path.join(snapshotPath, sectionFile)

                if (await filesystemService.exists(sectionPath)) {
                    sectionData[section] = await filesystemService.readJSON(sectionPath)
                }
            }

            // Read summary.txt if it exists
            let summaryText = ''
            const summaryPath = path.join(snapshotPath, 'summary.txt')
            if (await filesystemService.exists(summaryPath)) {
                summaryText = await filesystemService.readFile(summaryPath)
            }

            // Analyze sections
            const results = {
                sections: {},
                llmInteractions: {}
            }

            // First, analyze the overall system
            const systemAnalysis = await this.analyzeSystem(
                snapshotId,
                sectionData,
                summaryText,
                { model, depth }
            )

            results.sections.summary = systemAnalysis.analysis
            results.llmInteractions.summary = systemAnalysis.llmInteraction

            // Then, analyze each section
            for (const section of Object.keys(sectionData)) {
                logger.debug(`Analyzing section ${section}`)

                const sectionAnalysis = await this.analyzeSection(
                    section,
                    sectionData[section],
                    { model, depth }
                )

                results.sections[section] = sectionAnalysis.analysis
                results.llmInteractions[section] = sectionAnalysis.llmInteraction
            }

            return results
        } catch (error) {
            logger.error(`Error processing snapshot ${snapshotId}`, error)
            throw new Error(`Failed to process snapshot: ${error.message}`)
        }
    },

    /**
     * Analyze the overall system
     * @param {string} snapshotId - Snapshot ID
     * @param {Object} sectionData - All section data
     * @param {string} summaryText - Summary text
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeSystem(snapshotId, sectionData, summaryText, options) {
        const logger = loggerService.getLogger()

        try {
            const { model, depth } = options

            // Generate context for LLM
            let context = `Snapshot ID: ${snapshotId}\n\n`

            if (summaryText) {
                context += `Summary:\n${summaryText}\n\n`
            }

            context += `Available sections: ${Object.keys(sectionData).join(', ')}\n\n`

            // Setup the LLM prompt
            const prompt = `
I need you to analyze a system snapshot and provide insights into the system's health, performance, and potential issues.

Context:
${context}

Based on the above information, provide:
1. An overall assessment of the system health
2. Key findings and potential issues
3. Recommendations for improvement

Please format your response as JSON with the following structure:
{
  "overview": "Brief overview of system health",
  "issues": ["Issue 1", "Issue 2", ...],
  "recommendations": ["Recommendation 1", "Recommendation 2", ...],
  "systemHealth": {
    "overall": "Good/Fair/Poor",
    "performance": "Good/Fair/Poor",
    "security": "Good/Fair/Poor",
    "storage": "Good/Fair/Poor",
    "network": "Good/Fair/Poor"
  }
}
`.trim()

            // Call LLM service
            const llmResponse = await llmService.generateAnalysis(prompt, { model })

            // Parse LLM response
            let analysis = {}
            try {
                // Try to parse as JSON
                if (typeof llmResponse.content === 'string') {
                    // Extract JSON from markdown if needed
                    const jsonMatch = llmResponse.content.match(/```json\n([\s\S]*?)\n```/) ||
                        llmResponse.content.match(/```\n([\s\S]*?)\n```/) ||
                        [null, llmResponse.content]

                    analysis = JSON.parse(jsonMatch[1] || llmResponse.content)
                } else {
                    analysis = llmResponse.content
                }
            } catch (error) {
                logger.warn('Failed to parse LLM response as JSON', { error, response: llmResponse.content })

                // Provide a fallback analysis
                analysis = {
                    overview: "System appears to be functioning normally based on available data.",
                    issues: ["Unable to perform detailed analysis due to processing error"],
                    recommendations: ["Review raw snapshot data manually"],
                    systemHealth: {
                        overall: "Unknown",
                        performance: "Unknown",
                        security: "Unknown",
                        storage: "Unknown",
                        network: "Unknown"
                    }
                }
            }

            return {
                analysis,
                llmInteraction: {
                    prompt,
                    response: llmResponse.content,
                    model: llmResponse.model,
                    timestamp: new Date().toISOString(),
                    tokens: llmResponse.usage || {}
                }
            }
        } catch (error) {
            logger.error('Error analyzing system', error)

            // Return a basic analysis on error
            return {
                analysis: {
                    overview: "Analysis could not be completed due to an error.",
                    issues: ["Analysis processing error: " + error.message],
                    recommendations: ["Try analyzing again with different parameters"],
                    systemHealth: {
                        overall: "Unknown",
                        performance: "Unknown",
                        security: "Unknown",
                        storage: "Unknown",
                        network: "Unknown"
                    }
                },
                llmInteraction: {
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
            }
        }
    },

    /**
     * Analyze a specific section of snapshot data
     * @param {string} section - Section name
     * @param {Object} data - Section data
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeSection(section, data, options) {
        const logger = loggerService.getLogger()

        try {
            const { model, depth } = options

            // Generate context for LLM
            const context = `Section: ${section}\n\n${JSON.stringify(data, null, 2)}`

            // Setup the LLM prompt
            const prompt = `
I need you to analyze the following section from a system snapshot and provide insights.

${context}

Please analyze this data and provide:
1. A severity assessment (low, medium, high, critical, or info)
2. Key findings from the data
3. Specific recommendations based on the findings

Format your response as JSON with the following structure:
{
  "section": "${section}",
  "severity": "low/medium/high/critical/info/good",
  "overview": "Brief overview of findings",
  "findings": [
    {
      "severity": "low/medium/high/critical/info/good",
      "title": "Finding title",
      "description": "Detailed description"
    }
  ],
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ]
}
`.trim()

            // Call LLM service
            const llmResponse = await llmService.generateAnalysis(prompt, { model })

            // Parse LLM response
            let analysis = {}
            try {
                // Try to parse as JSON
                if (typeof llmResponse.content === 'string') {
                    // Extract JSON from markdown if needed
                    const jsonMatch = llmResponse.content.match(/```json\n([\s\S]*?)\n```/) ||
                        llmResponse.content.match(/```\n([\s\S]*?)\n```/) ||
                        [null, llmResponse.content]

                    analysis = JSON.parse(jsonMatch[1] || llmResponse.content)
                } else {
                    analysis = llmResponse.content
                }
            } catch (error) {
                logger.warn(`Failed to parse LLM response as JSON for section ${section}`, {
                    error,
                    response: llmResponse.content
                })

                // Provide a fallback analysis
                analysis = {
                    section,
                    severity: "info",
                    overview: `Analysis of ${section} data completed with parsing issues.`,
                    findings: [{
                        severity: "info",
                        title: "Data analysis completed",
                        description: "The data was analyzed but the results could not be properly formatted."
                    }],
                    recommendations: ["Review raw data manually"]
                }
            }

            return {
                analysis,
                llmInteraction: {
                    prompt,
                    response: llmResponse.content,
                    model: llmResponse.model,
                    timestamp: new Date().toISOString(),
                    tokens: llmResponse.usage || {}
                }
            }
        } catch (error) {
            logger.error(`Error analyzing section ${section}`, error)

            // Return a basic analysis on error
            return {
                analysis: {
                    section,
                    severity: "info",
                    overview: "Analysis could not be completed due to an error.",
                    findings: [{
                        severity: "info",
                        title: "Analysis error",
                        description: `Error analyzing ${section}: ${error.message}`
                    }],
                    recommendations: ["Try analyzing again with different parameters"]
                },
                llmInteraction: {
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
            }
        }
    },

    /**
     * Get sections relevant to specific focus areas
     * @param {Array} focus - Focus areas
     * @param {Array} availableFiles - Available files
     * @returns {Array} Relevant sections
     */
    getSectionsForFocus(focus, availableFiles) {
        // Mapping of focus areas to relevant sections
        const focusMap = {
            'System': ['System', 'Drivers', 'WindowsFeatures', 'Performance'],
            'Performance': ['Performance', 'DiskSpace', 'PerformanceData'],
            'Network': ['Network', 'NetworkConnections', 'NetworkAdapters'],
            'Security': ['InstalledPrograms', 'StartupPrograms', 'WindowsUpdates', 'RunningServices'],
            'Storage': ['DiskSpace', 'Path', 'Environment'],
            'Applications': ['InstalledPrograms', 'Browsers', 'StartupPrograms'],
            'Configuration': ['Environment', 'Path', 'RegistrySettings']
        }

        // Get all sections related to the focus areas
        const relevantSections = new Set()

        for (const area of focus) {
            if (focusMap[area]) {
                for (const section of focusMap[area]) {
                    relevantSections.add(section)
                }
            }
        }

        // Filter by actually available files
        return Array.from(relevantSections)
            .filter(section => availableFiles.includes(`${section}.json`))
    }
}

module.exports = processorService