'use strict'

const fs = require('fs').promises
const path = require('path')
const { createReadStream, createWriteStream } = require('fs')
const { pipeline } = require('stream/promises')

/**
 * Service for filesystem operations
 */
const filesystemService = {
    /**
     * Ensure a directory exists, creating it if necessary
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
     * Check if a file or directory exists
     * @param {string} filePath - Path to check
     * @returns {Promise<boolean>} True if exists, false otherwise
     */
    async exists(filePath) {
        try {
            await fs.access(filePath)
            return true
        } catch (error) {
            return false
        }
    },

    /**
     * Read a file as text
     * @param {string} filePath - Path to the file
     * @param {string} encoding - File encoding
     * @returns {Promise<string>} File contents
     */
    async readFile(filePath, encoding = 'utf8') {
        try {
            return await fs.readFile(filePath, encoding)
        } catch (error) {
            throw new Error(`Failed to read file ${filePath}: ${error.message}`)
        }
    },

    /**
     * Write data to a file
     * @param {string} filePath - Path to the file
     * @param {string|Buffer} data - Data to write
     * @param {string} encoding - File encoding
     * @returns {Promise<void>}
     */
    async writeFile(filePath, data, encoding = 'utf8') {
        try {
            // Ensure directory exists
            await this.ensureDir(path.dirname(filePath))

            // Write the file
            await fs.writeFile(filePath, data, encoding)
        } catch (error) {
            throw new Error(`Failed to write file ${filePath}: ${error.message}`)
        }
    },

    /**
     * Append data to a file
     * @param {string} filePath - Path to the file
     * @param {string|Buffer} data - Data to append
     * @param {string} encoding - File encoding
     * @returns {Promise<void>}
     */
    async appendFile(filePath, data, encoding = 'utf8') {
        try {
            // Ensure directory exists
            await this.ensureDir(path.dirname(filePath))

            // Append to the file
            await fs.appendFile(filePath, data, encoding)
        } catch (error) {
            throw new Error(`Failed to append to file ${filePath}: ${error.message}`)
        }
    },

    /**
     * Delete a file
     * @param {string} filePath - Path to the file
     * @returns {Promise<void>}
     */
    async deleteFile(filePath) {
        try {
            await fs.unlink(filePath)
        } catch (error) {
            throw new Error(`Failed to delete file ${filePath}: ${error.message}`)
        }
    },

    /**
     * Read a directory
     * @param {string} dirPath - Directory path
     * @returns {Promise<Array>} Array of file names
     */
    async readDir(dirPath) {
        try {
            return await fs.readdir(dirPath)
        } catch (error) {
            throw new Error(`Failed to read directory ${dirPath}: ${error.message}`)
        }
    },

    /**
     * Read a directory with file stats
     * @param {string} dirPath - Directory path
     * @returns {Promise<Array>} Array of file objects with stats
     */
    async readDirWithStats(dirPath) {
        try {
            const files = await fs.readdir(dirPath)

            // Get stats for each file
            const filesWithStats = await Promise.all(
                files.map(async (fileName) => {
                    const filePath = path.join(dirPath, fileName)
                    const stats = await fs.stat(filePath)

                    return {
                        name: fileName,
                        path: filePath,
                        size: stats.size,
                        isDirectory: stats.isDirectory(),
                        isFile: stats.isFile(),
                        created: stats.birthtime,
                        modified: stats.mtime
                    }
                })
            )

            return filesWithStats
        } catch (error) {
            throw new Error(`Failed to read directory ${dirPath} with stats: ${error.message}`)
        }
    },

    /**
     * Delete a directory and all its contents
     * @param {string} dirPath - Directory path
     * @param {boolean} recursive - Whether to delete recursively
     * @returns {Promise<void>}
     */
    async deleteDir(dirPath, recursive = true) {
        try {
            await fs.rm(dirPath, { recursive, force: true })
        } catch (error) {
            throw new Error(`Failed to delete directory ${dirPath}: ${error.message}`)
        }
    },

    /**
     * Copy a file
     * @param {string} sourcePath - Source file path
     * @param {string} destPath - Destination file path
     * @returns {Promise<string>} Destination path
     */
    async copyFile(sourcePath, destPath) {
        try {
            // Ensure destination directory exists
            await this.ensureDir(path.dirname(destPath))

            // Copy the file
            await fs.copyFile(sourcePath, destPath)
            return destPath
        } catch (error) {
            throw new Error(`Failed to copy file from ${sourcePath} to ${destPath}: ${error.message}`)
        }
    },

    /**
     * Move a file
     * @param {string} sourcePath - Source file path
     * @param {string} destPath - Destination file path
     * @returns {Promise<string>} Destination path
     */
    async moveFile(sourcePath, destPath) {
        try {
            // Ensure destination directory exists
            await this.ensureDir(path.dirname(destPath))

            // Move the file
            await fs.rename(sourcePath, destPath)
            return destPath
        } catch (error) {
            throw new Error(`Failed to move file from ${sourcePath} to ${destPath}: ${error.message}`)
        }
    },

    /**
     * Get file stats
     * @param {string} filePath - Path to the file
     * @returns {Promise<Object>} File stats
     */
    async getStats(filePath) {
        try {
            const stats = await fs.stat(filePath)
            return {
                size: stats.size,
                isDirectory: stats.isDirectory(),
                isFile: stats.isFile(),
                created: stats.birthtime,
                modified: stats.mtime,
                accessed: stats.atime
            }
        } catch (error) {
            throw new Error(`Failed to get stats for ${filePath}: ${error.message}`)
        }
    },

    /**
     * Read a file as JSON
     * @param {string} filePath - Path to the JSON file
     * @returns {Promise<Object>} Parsed JSON object
     */
    async readJSON(filePath) {
        try {
            const content = await this.readFile(filePath)
            return JSON.parse(content)
        } catch (error) {
            throw new Error(`Failed to read JSON file ${filePath}: ${error.message}`)
        }
    },

    /**
     * Write an object as JSON to a file
     * @param {string} filePath - Path to the file
     * @param {Object} data - Object to serialize as JSON
     * @param {boolean} pretty - Whether to pretty-print the JSON
     * @returns {Promise<void>}
     */
    async writeJSON(filePath, data, pretty = true) {
        try {
            const jsonString = pretty
                ? JSON.stringify(data, null, 2)
                : JSON.stringify(data)

            await this.writeFile(filePath, jsonString)
        } catch (error) {
            throw new Error(`Failed to write JSON file ${filePath}: ${error.message}`)
        }
    },

    /**
     * Create a read stream for a file
     * @param {string} filePath - Path to the file
     * @param {Object} options - Stream options
     * @returns {ReadStream} File read stream
     */
    createReadStream(filePath, options = {}) {
        return createReadStream(filePath, options)
    },

    /**
     * Create a write stream for a file
     * @param {string} filePath - Path to the file
     * @param {Object} options - Stream options
     * @returns {WriteStream} File write stream
     */
    createWriteStream(filePath, options = {}) {
        return createWriteStream(filePath, options)
    },

    /**
     * Stream a file from source to destination
     * @param {string} sourcePath - Source file path
     * @param {string} destPath - Destination file path
     * @returns {Promise<void>}
     */
    async streamFile(sourcePath, destPath) {
        try {
            // Ensure destination directory exists
            await this.ensureDir(path.dirname(destPath))

            // Create streams
            const source = this.createReadStream(sourcePath)
            const destination = this.createWriteStream(destPath)

            // Pipe data using stream pipeline
            await pipeline(source, destination)
        } catch (error) {
            throw new Error(`Failed to stream file from ${sourcePath} to ${destPath}: ${error.message}`)
        }
    }
}

module.exports = filesystemService