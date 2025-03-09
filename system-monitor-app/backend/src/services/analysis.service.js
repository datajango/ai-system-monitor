// backend/src/services/analysis.service.js
'use strict'

const path = require('path')
const fs = require('fs').promises
const environmentService = require('./environment.service')
const snapshotService = require('./snapshot.service')

// Service functions for analysis operations
const analysisService = {
    // Get analysis for a specific snapshot
    async getAnalysisById(id) {
        try {
            const analyzerOutputDir = environmentService.getAnalyzerOutputDir()
            const analysisDir = path.join(analyzerOutputDir, id)

            // Check if analysis directory exists
            try {
                await fs.access(analysisDir)
            } catch (err) {
                return null // Analysis doesn't exist
            }

            // Read the analysis data
            const files = await fs.readdir(analysisDir)
            const jsonFiles = files.filter(file => file.endsWith('Analysis.json'))

            // Read and parse each JSON file
            const data = {}
            for (const file of jsonFiles) {
                try {
                    const filePath = path.join(analysisDir, file)
                    const content = await fs.readFile(filePath, 'utf8')
                    // Extract section name by removing 'Analysis.json'
                    const section = path.basename(file, 'Analysis.json')
                    data[section] = JSON.parse(content)
                } catch (err) {
                    console.error(`Error reading/parsing ${file}:`, err)
                    // Continue to next file
                }
            }

            // Check if LLM interactions are available
            const llmDir = path.join(analysisDir, 'llm')
            try {
                await fs.access(llmDir)

                // Read LLM interaction files
                const llmFiles = await fs.readdir(llmDir)
                const llmJsonFiles = llmFiles.filter(file => file.endsWith('llm_interaction.json'))

                data.llmInteractions = {}

                for (const file of llmJsonFiles) {
                    try {
                        const filePath = path.join(llmDir, file)
                        const content = await fs.readFile(filePath, 'utf8')
                        // Extract section name by removing '_llm_interaction.json'
                        const section = path.basename(file, '_llm_interaction.json')
                        data.llmInteractions[section] = JSON.parse(content)
                    } catch (err) {
                        console.error(`Error reading/parsing LLM file ${file}:`, err)
                        // Continue to next file
                    }
                }

            } catch (err) {
                // LLM directory might not exist, that's okay
            }

            return {
                id,
                timestamp: new Date().toISOString(),
                data
            }
        } catch (err) {
            console.error(`Error getting analysis for snapshot ${id}:`, err)
            throw new Error(`Failed to retrieve analysis: ${err.message}`)
        }
    },

    // Run analysis on a snapshot
    async runAnalysis(id, { model, focus }) {
        try {
            // For testing/development, we'll simulate creating an analysis
            // In production, this would call the actual Python analyzer script

            const snapshotsDir = environmentService.getSnapshotsDir()
            const snapshotPath = path.join(snapshotsDir, id)

            const analyzerOutputDir = environmentService.getAnalyzerOutputDir()
            const analysisDir = path.join(analyzerOutputDir, id)

            // Check if snapshot exists
            try {
                await fs.access(snapshotPath)
            } catch (err) {
                throw new Error(`Snapshot ${id} not found`)
            }

            // Ensure the analysis directory exists
            await fs.mkdir(analysisDir, { recursive: true })

            // Create llm directory for interactions
            const llmDir = path.join(analysisDir, 'llm')
            await fs.mkdir(llmDir, { recursive: true })

            // Get the snapshot data to generate a realistic analysis
            const snapshot = await snapshotService.getSnapshotById(id)

            // For each section in the snapshot, create a corresponding analysis file
            const sectionsToAnalyze = focus && focus.length > 0
                ? focus
                : Object.keys(snapshot.data).filter(key =>
                    key !== 'summaryText' &&
                    typeof snapshot.data[key] === 'object' &&
                    key !== 'index');

            // Create the summary analysis
            await this.generateSummaryAnalysis(analysisDir, llmDir, model, snapshot);

            // Process each section
            for (const section of sectionsToAnalyze) {
                if (snapshot.data[section]) {
                    await this.generateSectionAnalysis(section, analysisDir, llmDir, model, snapshot);
                }
            }

            return {
                success: true,
                message: 'Analysis completed successfully',
                output: `Generated analysis for snapshot ${id}`
            }
        } catch (err) {
            console.error(`Error analyzing snapshot ${id}:`, err)
            throw new Error(`Failed to analyze snapshot: ${err.message}`)
        }
    },

    // Generate summary analysis
    async generateSummaryAnalysis(analysisDir, llmDir, model, snapshot) {
        // Create the summary analysis
        const summaryAnalysis = {
            overview: 'System appears to be in good health. Some optimization opportunities were identified.',
            issues: [
                'Multiple browser installations may be consuming extra disk space',
                'Several network connections from Chrome browser found',
                'Disk space on C: drive is running low (24.4% free)',
                'Some startup programs might be unnecessary'
            ],
            recommendations: [
                'Consider uninstalling unused browsers to free up disk space',
                'Review Chrome extensions to ensure they are all necessary and trusted',
                'Clean up temporary files to free disk space on C: drive',
                'Disable non-essential startup programs to improve boot time'
            ],
            systemHealth: {
                overall: 'Good',
                performance: 'Good',
                security: 'Good',
                storage: 'Attention needed',
                network: 'Good'
            }
        };

        // Write summary analysis
        await fs.writeFile(
            path.join(analysisDir, 'summaryAnalysis.json'),
            JSON.stringify(summaryAnalysis, null, 2),
            'utf8'
        );

        // Create a sample LLM interaction for the summary
        const summaryLlmInteraction = {
            prompt: "Analyze the following system snapshot and provide a concise summary of the system health, highlighting any issues and providing recommendations for improvement.",
            response: "Based on the system snapshot, the system appears to be in good overall health, but there are a few areas that could use attention.\n\nThe system has multiple web browsers installed (Chrome and Firefox) which could be consuming extra disk space if one is rarely used. Additionally, there are several network connections from Chrome browser that should be reviewed for security purposes.\n\nThe C: drive is running low on space with only 24.4% free, which could impact system performance if it continues to decrease.\n\nSome startup programs were detected that may not be essential for system operation, which could be impacting boot time and ongoing system performance.\n\nRecommendations:\n1. Consider uninstalling unused browsers to free up disk space\n2. Review Chrome extensions to ensure they are all necessary and trusted\n3. Clean up temporary files to free disk space on C: drive\n4. Disable non-essential startup programs to improve boot time",
            model: model || environmentService.getDefaultLlmModel(),
            timestamp: new Date().toISOString()
        };

        await fs.writeFile(
            path.join(llmDir, 'summary_llm_interaction.json'),
            JSON.stringify(summaryLlmInteraction, null, 2),
            'utf8'
        );
    },

    // Generate section-specific analysis
    async generateSectionAnalysis(section, analysisDir, llmDir, model, snapshot) {
        // Create sample analysis for this section
        const severityLevels = ['low', 'medium', 'info', 'good'];
        const randomSeverity = severityLevels[Math.floor(Math.random() * severityLevels.length)];

        const sectionAnalysis = {
            section,
            severity: randomSeverity,
            overview: `Analysis results for ${section} section.`,
            findings: [
                {
                    severity: 'info',
                    title: `Sample finding for ${section}`,
                    description: `This is a sample finding for the ${section} section.`
                },
                {
                    severity: randomSeverity,
                    title: `Another finding for ${section}`,
                    description: `This is another sample finding for the ${section} section.`
                }
            ],
            recommendations: [
                `Sample recommendation for ${section}`,
                `Another recommendation for ${section}`
            ]
        };

        // Customize analysis based on section type
        if (section === 'DiskSpace') {
            sectionAnalysis.severity = 'medium';
            sectionAnalysis.overview = 'The system has limited free space on the C: drive.';
            sectionAnalysis.findings = [
                {
                    severity: 'medium',
                    title: 'Low disk space on C: drive',
                    description: 'The C: drive has only 24.4% free space remaining (125 GB out of 512 GB). This could lead to performance issues if the space continues to decrease.'
                },
                {
                    severity: 'good',
                    title: 'Sufficient space on D: drive',
                    description: 'The D: drive has 63.5% free space (650 GB out of 1024 GB), which is healthy.'
                }
            ];
            sectionAnalysis.recommendations = [
                'Run Disk Cleanup to remove temporary files',
                'Consider moving large files to the D: drive',
                'Uninstall unnecessary applications'
            ];
        } else if (section === 'Browsers') {
            sectionAnalysis.severity = 'low';
            sectionAnalysis.overview = 'Multiple browsers installed with extensions that should be reviewed.';
            sectionAnalysis.findings = [
                {
                    severity: 'low',
                    title: 'Multiple browsers installed',
                    description: 'Both Chrome and Firefox are installed, which may be consuming unnecessary disk space if one is rarely used.'
                },
                {
                    severity: 'info',
                    title: 'Chrome extensions detected',
                    description: 'Chrome has the uBlock Origin extension installed, which is generally considered beneficial for security and performance.'
                }
            ];
        } else if (section === 'Network') {
            sectionAnalysis.severity = 'low';
            sectionAnalysis.overview = 'Network configuration appears standard with some active connections to monitor.';
            sectionAnalysis.findings = [
                {
                    severity: 'info',
                    title: 'Multiple network adapters',
                    description: 'System has both Ethernet and Wi-Fi adapters, with Ethernet currently active.'
                },
                {
                    severity: 'low',
                    title: 'Active outbound connections',
                    description: 'Several outbound connections from Chrome browser were detected. This is normal but should be monitored.'
                }
            ];
        }

        // Write section analysis
        await fs.writeFile(
            path.join(analysisDir, `${section}Analysis.json`),
            JSON.stringify(sectionAnalysis, null, 2),
            'utf8'
        );

        // Create a sample LLM interaction for this section
        const sectionLlmInteraction = {
            prompt: `Analyze the following ${section} data from a system snapshot and provide insights, identify potential issues, and suggest improvements.`,
            response: `Based on the ${section} data provided, I can identify the following insights:\n\n${sectionAnalysis.overview}\n\nFindings:\n- ${sectionAnalysis.findings[0].title}: ${sectionAnalysis.findings[0].description}\n- ${sectionAnalysis.findings[1].title}: ${sectionAnalysis.findings[1].description}\n\nRecommendations:\n- ${sectionAnalysis.recommendations[0]}\n- ${sectionAnalysis.recommendations[1]}`,
            model: model || environmentService.getDefaultLlmModel(),
            timestamp: new Date().toISOString()
        };

        await fs.writeFile(
            path.join(llmDir, `${section}_llm_interaction.json`),
            JSON.stringify(sectionLlmInteraction, null, 2),
            'utf8'
        );

        // For InstalledPrograms, create additional category-specific LLM interactions
        if (section === 'InstalledPrograms') {
            await this.generateProgramsAnalysis(llmDir, model);
        }

        // For Network, create additional aspect-specific LLM interactions
        if (section === 'Network') {
            await this.generateNetworkAnalysis(llmDir, model);
        }
    },

    // Generate InstalledPrograms category-specific analysis
    async generateProgramsAnalysis(llmDir, model) {
        const categories = ['development', 'security', 'utilities', 'other', 'recent', 'summary'];

        for (const category of categories) {
            const categoryLlmInteraction = {
                prompt: `Analyze the installed programs in the ${category} category and provide insights.`,
                response: `Based on the analysis of ${category} software, I have the following observations:\n\nThe system has several ${category} applications installed including sample applications. These appear to be properly maintained and up to date. No significant issues detected in this category.`,
                model: model || environmentService.getDefaultLlmModel(),
                timestamp: new Date().toISOString()
            };

            await fs.writeFile(
                path.join(llmDir, `InstalledPrograms_${category}_llm_interaction.json`),
                JSON.stringify(categoryLlmInteraction, null, 2),
                'utf8'
            );
        }
    },

    // Generate Network aspect-specific analysis
    async generateNetworkAnalysis(llmDir, model) {
        const aspects = ['adapters', 'connections', 'dns', 'ip_config', 'summary'];

        for (const aspect of aspects) {
            const aspectLlmInteraction = {
                prompt: `Analyze the network ${aspect} configuration and provide insights.`,
                response: `Analysis of network ${aspect}:\n\nThe network ${aspect} configuration appears to be standard for a Windows system. The primary connection is through Ethernet with a proper IP address assignment. No significant issues detected with the ${aspect} configuration.`,
                model: model || environmentService.getDefaultLlmModel(),
                timestamp: new Date().toISOString()
            };

            await fs.writeFile(
                path.join(llmDir, `Network_${aspect}_llm_interaction.json`),
                JSON.stringify(aspectLlmInteraction, null, 2),
                'utf8'
            );
        }
    }
}

module.exports = analysisService