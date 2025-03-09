// backend/src/services/system.service.js
'use strict'

const snapshotService = require('./snapshot.service')
const analysisService = require('./analysis.service')
const comparisonService = require('./comparison.service')

// Main system service that orchestrates snapshot, analysis, and comparison operations
const systemService = {
    // Get all available system snapshots
    async getAllSnapshots() {
        return await snapshotService.getAllSnapshots()
    },

    // Get a specific snapshot by ID
    async getSnapshotById(id) {
        return await snapshotService.getSnapshotById(id)
    },

    // Get analysis for a specific snapshot
    async getAnalysisById(id) {
        return await analysisService.getAnalysisById(id)
    },

    // Run a new system snapshot collection
    async runCollection(options) {
        return await snapshotService.runCollection(options)
    },

    // Run analysis on a snapshot
    async runAnalysis(id, options) {
        return await analysisService.runAnalysis(id, options)
    },

    // Compare two snapshots
    async compareSnapshots(baselineId, currentId, sections) {
        return await comparisonService.compareSnapshots(baselineId, currentId, sections)
    }
}

module.exports = systemService