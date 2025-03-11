'use strict'

const path = require('path')
const fs = require('fs').promises
const constants = require('../common/constants')

/**
 * Path utilities
 */
const pathUtils = {
    /**
     * Get an absolute path
     * @param {string} relativePath - Relative path
     * @returns {string} Absolute path
     */
    getAbsolutePath(relativePath) {
        // If already absolute, return as is
        if (path.isAbsolute(relativePath)) {
            return relativePath
        }

        // Otherwise, make it absolute relative to current working directory
        return path.resolve(process.cwd(), relativePath)
    },

    /**
     * Get a relative path
     * @param {string} absolutePath - Absolute path
     * @param {string} basePath - Base path
     * @returns {string} Relative path
     */
    getRelativePath(absolutePath, basePath = process.cwd()) {
        return path.relative(basePath, absolutePath)
    },

    /**
     * Join path segments
     * @param {...string} segments - Path segments
     * @returns {string} Joined path
     */
    joinPaths(...segments) {
        return path.join(...segments)
    },

    /**
     * Normalize a path
     * @param {string} pathString - Path to normalize
     * @returns {string} Normalized path
     */
    normalizePath(pathString) {
        return path.normalize(pathString)
    },

    /**
     * Check if a path exists
     * @param {string} pathString - Path to check
     * @returns {Promise<boolean>} True if exists, false otherwise
     */
    async pathExists(pathString) {
        try {
            await fs.access(pathString)
            return true
        } catch (error) {
            return false
        }
    },

    /**
     * Ensure a directory exists
     * @param {string} dirPath - Directory path
     * @returns {Promise<string>} The directory path
     */
    async ensureDir(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true })
            return dirPath
        } catch (error) {
            throw new Error(`Failed to create directory ${dirPath}: ${error.message}`)
        }
    },

    /**
     * Generate a snapshot path
     * @param {string} snapshotId - Snapshot ID
     * @param {string} snapshotsDir - Snapshots directory
     * @returns {string} Snapshot path
     */
    getSnapshotPath(snapshotId, snapshotsDir) {
        return path.join(snapshotsDir, snapshotId)
    },

    /**
     * Generate an analysis path
     * @param {string} snapshotId - Snapshot ID
     * @param {string} analysisDir - Analysis directory
     * @returns {string} Analysis path
     */
    getAnalysisPath(snapshotId, analysisDir) {
        return path.join(analysisDir, snapshotId)
    },

    /**
     * Generate a snapshot file path
     * @param {string} snapshotId - Snapshot ID
     * @param {string} fileName - File name
     * @param {string} snapshotsDir - Snapshots directory
     * @returns {string} File path
     */
    getSnapshotFilePath(snapshotId, fileName, snapshotsDir) {
        return path.join(snapshotsDir, snapshotId, fileName)
    },

    /**
     * Generate an analysis file path
     * @param {string} snapshotId - Snapshot ID
     * @param {string} fileName - File name
     * @param {string} analysisDir - Analysis directory
     * @returns {string} File path
     */
    getAnalysisFilePath(snapshotId, fileName, analysisDir) {
        return path.join(analysisDir, snapshotId, fileName)
    },

    /**
     * Extract section name from file name
     * @param {string} fileName - File name
     * @returns {string} Section name
     */
    getSectionFromFileName(fileName) {
        return path.basename(fileName, '.json')
    },

    /**
     * Extract snapshot ID from path
     * @param {string} pathString - Path containing snapshot ID
     * @returns {string|null} Snapshot ID or null if not found
     */
    extractSnapshotId(pathString) {
        const parts = pathString.split(path.sep)

        for (const part of parts) {
            if (part.startsWith(constants.SNAPSHOT.ID_PREFIX)) {
                return part
            }
        }

        return null
    },

    /**
     * Check if a path is a valid directory
     * @param {string} pathString - Path to check
     * @returns {Promise<boolean>} True if it's a valid directory
     */
    async isValidDirectory(pathString) {
        try {
            const stats = await fs.stat(pathString)
            return stats.isDirectory()
        } catch (error) {
            return false
        }
    },

    /**
     * Generate a timestamp-based file name
     * @param {string} prefix - File name prefix
     * @param {string} extension - File extension
     * @returns {string} Generated file name
     */
    generateTimestampFileName(prefix = '', extension = '.json') {
        const now = new Date()
        const dateStr = now.toISOString().split('T')[0]
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-')

        return `${prefix}${dateStr}_${timeStr}${extension}`
    },

    /**
     * Find files matching a pattern
     * @param {string} directoryPath - Directory to search
     * @param {RegExp} pattern - Pattern to match
     * @returns {Promise<Array>} Matching files
     */
    async findFiles(directoryPath, pattern) {
        try {
            const entries = await fs.readdir(directoryPath, { withFileTypes: true })

            const matchingFiles = []

            for (const entry of entries) {
                if (entry.isFile() && pattern.test(entry.name)) {
                    matchingFiles.push(entry.name)
                }
            }

            return matchingFiles
        } catch (error) {
            throw new Error(`Failed to find files: ${error.message}`)
        }
    }
}

module.exports = pathUtils