'use strict'

const loggerService = require('./logger.service')

/**
 * Service for formatting analysis reports
 */
const reportService = {
    /**
     * Format an analysis report
     * @param {Object} analysis - Analysis data
     * @returns {Object} Formatted report
     */
    formatAnalysisReport(analysis) {
        try {
            // Extract data from analysis
            const { data = {}, id, timestamp, status } = analysis

            // Extract summary if available
            const summary = data.summary || {}

            // Count issues by severity
            const issueCounts = this.countIssuesBySeverity(data)

            // Get top issues
            const topIssues = this.getTopIssues(data)

            // Create formatted report
            const report = {
                id,
                generatedAt: new Date().toISOString(),
                snapshotTimestamp: timestamp,
                status,
                summary: {
                    overview: summary.overview || 'No summary available',
                    systemHealth: summary.systemHealth || { overall: 'Unknown' },
                    issueCount: issueCounts.total,
                    severityCounts: {
                        critical: issueCounts.critical || 0,
                        high: issueCounts.high || 0,
                        medium: issueCounts.medium || 0,
                        low: issueCounts.low || 0,
                        info: issueCounts.info || 0
                    }
                },
                topIssues,
                sections: this.formatSections(data),
                recommendations: this.formatRecommendations(data)
            }

            return report
        } catch (error) {
            loggerService.error('Error formatting analysis report', error)

            // Return a basic report on error
            return {
                generatedAt: new Date().toISOString(),
                error: `Failed to format report: ${error.message}`,
                summary: {
                    overview: 'Error generating report',
                    issueCount: 0,
                    severityCounts: {}
                },
                topIssues: [],
                sections: [],
                recommendations: []
            }
        }
    },

    /**
     * Count issues by severity
     * @param {Object} data - Analysis data
     * @returns {Object} Issue counts
     */
    countIssuesBySeverity(data) {
        // Initialize counts
        const counts = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            info: 0,
            total: 0
        }

        // Count issues from each section
        for (const [section, sectionData] of Object.entries(data)) {
            // Skip non-object sections or llmInteractions
            if (typeof sectionData !== 'object' || section === 'llmInteractions') {
                continue
            }

            // Count findings if they exist
            if (Array.isArray(sectionData.findings)) {
                for (const finding of sectionData.findings) {
                    const severity = (finding.severity || '').toLowerCase()

                    if (counts[severity] !== undefined) {
                        counts[severity]++
                        counts.total++
                    }
                }
            }
        }

        return counts
    },

    /**
     * Get top issues from analysis
     * @param {Object} data - Analysis data
     * @param {number} limit - Maximum number of issues
     * @returns {Array} Top issues
     */
    getTopIssues(data, limit = 5) {
        // Collect all findings
        const allFindings = []

        for (const [section, sectionData] of Object.entries(data)) {
            // Skip non-object sections or llmInteractions
            if (typeof sectionData !== 'object' || section === 'llmInteractions') {
                continue
            }

            // Add findings if they exist
            if (Array.isArray(sectionData.findings)) {
                for (const finding of sectionData.findings) {
                    // Add section information to finding
                    allFindings.push({
                        ...finding,
                        section
                    })
                }
            }
        }

        // Sort by severity (critical -> high -> medium -> low -> info)
        const severityOrder = {
            'critical': 0,
            'high': 1,
            'medium': 2,
            'low': 3,
            'info': 4
        }

        const sortedFindings = allFindings.sort((a, b) => {
            const severityA = (a.severity || '').toLowerCase()
            const severityB = (b.severity || '').toLowerCase()

            return (severityOrder[severityA] || 99) - (severityOrder[severityB] || 99)
        })

        // Return top issues
        return sortedFindings.slice(0, limit)
    },

    /**
     * Format sections for report
     * @param {Object} data - Analysis data
     * @returns {Array} Formatted sections
     */
    formatSections(data) {
        const sections = []

        for (const [section, sectionData] of Object.entries(data)) {
            // Skip non-object sections or llmInteractions
            if (typeof sectionData !== 'object' || section === 'llmInteractions') {
                continue
            }

            // Format section data
            sections.push({
                name: section,
                severity: sectionData.severity || 'info',
                overview: sectionData.overview || `Analysis of ${section} section`,
                findings: Array.isArray(sectionData.findings) ? sectionData.findings : [],
                recommendations: Array.isArray(sectionData.recommendations) ? sectionData.recommendations : []
            })
        }

        // Sort sections by severity
        const severityOrder = {
            'critical': 0,
            'high': 1,
            'medium': 2,
            'low': 3,
            'info': 4,
            'good': 5
        }

        return sections.sort((a, b) => {
            const severityA = (a.severity || '').toLowerCase()
            const severityB = (b.severity || '').toLowerCase()

            return (severityOrder[severityA] || 99) - (severityOrder[severityB] || 99)
        })
    },

    /**
     * Format recommendations for report
     * @param {Object} data - Analysis data
     * @returns {Array} Formatted recommendations
     */
    formatRecommendations(data) {
        // Get summary recommendations if available
        const summaryRecommendations = data.summary?.recommendations || []

        // Collect all section recommendations
        const sectionRecommendations = []

        for (const [section, sectionData] of Object.entries(data)) {
            // Skip non-object sections or llmInteractions
            if (typeof sectionData !== 'object' || section === 'llmInteractions' || section === 'summary') {
                continue
            }

            // Add recommendations if they exist
            if (Array.isArray(sectionData.recommendations)) {
                for (const recommendation of sectionData.recommendations) {
                    sectionRecommendations.push({
                        section,
                        recommendation
                    })
                }
            }
        }

        // Combine all recommendations
        const allRecommendations = [
            // Add summary recommendations
            ...summaryRecommendations.map(recommendation => ({
                section: 'summary',
                recommendation
            })),
            // Add section recommendations
            ...sectionRecommendations
        ]

        // Remove duplicates
        const uniqueRecommendations = []
        const recommendationSet = new Set()

        for (const item of allRecommendations) {
            const normalizedRec = item.recommendation.toLowerCase().trim()

            if (!recommendationSet.has(normalizedRec)) {
                recommendationSet.add(normalizedRec)
                uniqueRecommendations.push(item)
            }
        }

        return uniqueRecommendations
    },

    /**
     * Generate a markdown report
     * @param {Object} report - Report data
     * @returns {string} Markdown report
     */
    generateMarkdownReport(report) {
        try {
            const { id, generatedAt, snapshotTimestamp, summary, topIssues, sections, recommendations } = report

            let markdown = `# System Analysis Report
      
## Overview
- **Snapshot ID**: ${id}
- **Analyzed**: ${new Date(generatedAt).toLocaleString()}
- **Snapshot Time**: ${new Date(snapshotTimestamp).toLocaleString()}
- **System Health**: ${summary.systemHealth?.overall || 'Unknown'}
- **Total Issues**: ${summary.issueCount}

${summary.overview}

## Issue Summary
- Critical: ${summary.severityCounts.critical || 0}
- High: ${summary.severityCounts.high || 0}
- Medium: ${summary.severityCounts.medium || 0}
- Low: ${summary.severityCounts.low || 0}
- Info: ${summary.severityCounts.info || 0}

## Top Issues
`

            // Add top issues
            if (topIssues.length === 0) {
                markdown += 'No significant issues detected.\n'
            } else {
                for (const issue of topIssues) {
                    markdown += `### [${issue.severity.toUpperCase()}] ${issue.title}\n`
                    markdown += `- **Section**: ${issue.section}\n`
                    markdown += `- ${issue.description}\n\n`
                }
            }

            // Add section summaries
            markdown += '## Section Summaries\n'

            for (const section of sections) {
                markdown += `### ${section.name} (${section.severity.toUpperCase()})\n`
                markdown += `${section.overview}\n\n`

                if (section.findings.length > 0) {
                    markdown += '#### Findings\n'
                    for (const finding of section.findings) {
                        markdown += `- [${finding.severity.toUpperCase()}] ${finding.title}: ${finding.description}\n`
                    }
                    markdown += '\n'
                }
            }

            // Add recommendations
            markdown += '## Recommendations\n'

            if (recommendations.length === 0) {
                markdown += 'No specific recommendations available.\n'
            } else {
                for (const { section, recommendation } of recommendations) {
                    markdown += `- **${section}**: ${recommendation}\n`
                }
            }

            return markdown
        } catch (error) {
            loggerService.error('Error generating markdown report', error)
            return `# Error Generating Report\n\nFailed to generate markdown report: ${error.message}`
        }
    },

    /**
     * Compare analysis reports
     * @param {Object} baseline - Baseline analysis
     * @param {Object} current - Current analysis
     * @param {Object} options - Comparison options
     * @returns {Object} Comparison results
     */
    compareAnalysisReports(baseline, current, options = {}) {
        try {
            const {
                sections = Object.keys({ ...baseline.data, ...current.data })
                    .filter(key => key !== 'llmInteractions')
            } = options

            // Initialize results
            const results = {
                sections: {},
                changes: {
                    improved: [],
                    worsened: [],
                    unchanged: [],
                    new: [],
                    resolved: []
                },
                summary: {
                    baselineIssues: this.countIssuesBySeverity(baseline.data),
                    currentIssues: this.countIssuesBySeverity(current.data),
                    changeSummary: ''
                }
            }

            // Compare sections
            for (const section of sections) {
                const baselineSection = baseline.data[section]
                const currentSection = current.data[section]

                // Skip if both are missing
                if (!baselineSection && !currentSection) {
                    continue
                }

                // Compare section
                results.sections[section] = this.compareSection(baselineSection, currentSection)

                // Add to change lists
                this.categorizeSectionChanges(section, results.sections[section], results.changes)
            }

            // Generate overall change summary
            const { baselineIssues, currentIssues } = results.summary

            // Calculate difference in total issues
            const diff = currentIssues.total - baselineIssues.total
            let changeDescription = ''

            if (diff > 0) {
                changeDescription = `Added ${diff} new issue${diff > 1 ? 's' : ''}`
            } else if (diff < 0) {
                changeDescription = `Resolved ${Math.abs(diff)} issue${Math.abs(diff) > 1 ? 's' : ''}`
            } else {
                changeDescription = 'Same number of total issues'
            }

            // Add severity changes
            const severityChanges = []

            for (const severity of ['critical', 'high', 'medium', 'low']) {
                const severityDiff = currentIssues[severity] - baselineIssues[severity]

                if (severityDiff > 0) {
                    severityChanges.push(`+${severityDiff} ${severity}`)
                } else if (severityDiff < 0) {
                    severityChanges.push(`${severityDiff} ${severity}`)
                }
            }

            // Add to summary
            results.summary.changeSummary = `${changeDescription} (${severityChanges.join(', ')})`

            return results
        } catch (error) {
            loggerService.error('Error comparing analysis reports', error)

            return {
                error: `Failed to compare reports: ${error.message}`,
                sections: {},
                changes: {
                    improved: [],
                    worsened: [],
                    unchanged: [],
                    new: [],
                    resolved: []
                },
                summary: {
                    changeSummary: 'Comparison failed'
                }
            }
        }
    },

    /**
     * Compare two sections
     * @param {Object} baseline - Baseline section
     * @param {Object} current - Current section
     * @returns {Object} Section comparison
     */
    compareSection(baseline, current) {
        // Handle missing sections
        if (!baseline) {
            return {
                status: 'new',
                changes: [],
                baselineSeverity: null,
                currentSeverity: current?.severity || 'info'
            }
        }

        if (!current) {
            return {
                status: 'removed',
                changes: [],
                baselineSeverity: baseline?.severity || 'info',
                currentSeverity: null
            }
        }

        // Get severities
        const baselineSeverity = baseline.severity || 'info'
        const currentSeverity = current.severity || 'info'

        // Get finding maps by title
        const baselineFindings = new Map()
        const currentFindings = new Map()

        if (Array.isArray(baseline.findings)) {
            for (const finding of baseline.findings) {
                baselineFindings.set(finding.title, finding)
            }
        }

        if (Array.isArray(current.findings)) {
            for (const finding of current.findings) {
                currentFindings.set(finding.title, finding)
            }
        }

        // Track changes
        const changes = []

        // Find resolved issues
        for (const [title, finding] of baselineFindings.entries()) {
            if (!currentFindings.has(title)) {
                changes.push({
                    type: 'resolved',
                    finding
                })
            }
        }

        // Find new and changed issues
        for (const [title, finding] of currentFindings.entries()) {
            if (!baselineFindings.has(title)) {
                changes.push({
                    type: 'new',
                    finding
                })
            } else {
                const baselineFinding = baselineFindings.get(title)

                // Compare severity
                if (baselineFinding.severity !== finding.severity) {
                    const severityOrder = {
                        'critical': 0,
                        'high': 1,
                        'medium': 2,
                        'low': 3,
                        'info': 4,
                        'good': 5
                    }

                    const baselineValue = severityOrder[baselineFinding.severity] || 99
                    const currentValue = severityOrder[finding.severity] || 99

                    changes.push({
                        type: currentValue < baselineValue ? 'worsened' : 'improved',
                        baseline: baselineFinding,
                        current: finding
                    })
                }
            }
        }

        // Determine overall status
        let status = 'unchanged'

        if (changes.length > 0) {
            const severityOrder = {
                'critical': 0,
                'high': 1,
                'medium': 2,
                'low': 3,
                'info': 4,
                'good': 5
            }

            const baselineValue = severityOrder[baselineSeverity] || 99
            const currentValue = severityOrder[currentSeverity] || 99

            if (currentValue < baselineValue) {
                status = 'worsened'
            } else if (currentValue > baselineValue) {
                status = 'improved'
            } else {
                status = 'changed'
            }
        }

        return {
            status,
            changes,
            baselineSeverity,
            currentSeverity
        }
    },

    /**
     * Categorize section changes
     * @param {string} section - Section name
     * @param {Object} comparison - Section comparison
     * @param {Object} changes - Change categories
     */
    categorizeSectionChanges(section, comparison, changes) {
        const { status } = comparison

        if (status === 'unchanged') {
            changes.unchanged.push(section)
        } else if (status === 'new') {
            changes.new.push(section)
        } else if (status === 'removed') {
            changes.resolved.push(section)
        } else if (status === 'improved') {
            changes.improved.push(section)
        } else if (status === 'worsened') {
            changes.worsened.push(section)
        }
    }
}

module.exports = reportService