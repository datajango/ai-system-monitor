// backend/src/services/snapshot.service.js
'use strict'

const snapshotReaderService = require('./snapshot-reader.service')
const snapshotCreatorService = require('./snapshot-creator.service')
const snapshotFileService = require('./snapshot-file.service')

// Main service for snapshot operations, now acting as a facade
const snapshotService = {
    // Get all available system snapshots
    async getAllSnapshots() {
        return await snapshotReaderService.getAllSnapshots()
    },

    // Get a specific snapshot by ID
    async getSnapshotById(id) {
        return await snapshotReaderService.getSnapshotById(id)
    },

    // Run a new system snapshot collection
    async runCollection(options) {
        return await snapshotCreatorService.runCollection(options)
    },

    // Get all files in a snapshot
    async getSnapshotFiles(id) {
        return await snapshotFileService.getSnapshotFiles(id)
    },

    // Get a specific file from a snapshot
    async getSnapshotFile(id, fileName) {
        return await snapshotFileService.getSnapshotFile(id, fileName)
    },

    // Delete a snapshot by ID
    async deleteSnapshotById(id) {
        return await snapshotFileService.deleteSnapshotById(id);
    }
}

module.exports = snapshotService