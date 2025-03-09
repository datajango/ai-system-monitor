// backend/src/config/config.js
'use strict'

const path = require('path')
const os = require('os')
const environmentService = require('../services/environment.service')

// Default paths
const CONFIG_DIR = path.join(os.homedir(), '.system-monitor')
const CONFIG_FILE_PATH = path.join(CONFIG_DIR, 'config.json')

// Function to get default snapshots directory
function getDefaultSnapshotsDir() {
    return environmentService.getSnapshotsDir()
}

// Function to get default analyzer output directory
function getDefaultAnalyzerOutputDir() {
    return environmentService.getAnalyzerOutputDir()
}

// Function to get default LLM configuration
function getDefaultLlmConfig() {
    return {
        serverUrl: environmentService.getLlmServerUrl(),
        model: environmentService.getDefaultLlmModel(),
        maxTokens: environmentService.getLlmMaxTokens(),
        temperature: environmentService.getLlmTemperature()
    }
}

// Helper function to convert file size string to bytes
function parseFileSize(sizeStr) {
    const units = {
        'b': 1,
        'kb': 1024,
        'mb': 1024 * 1024,
        'gb': 1024 * 1024 * 1024,
        'tb': 1024 * 1024 * 1024 * 1024
    };

    const match = sizeStr.toLowerCase().match(/^(\d+)([a-z]{1,2})$/);
    if (match) {
        const size = parseInt(match[1], 10);
        const unit = match[2];
        if (units[unit]) {
            return size * units[unit];
        }
    }

    // If couldn't parse or no units specified, assume it's in bytes
    return parseInt(sizeStr, 10);
}

// Server configuration
const serverConfig = {
    port: environmentService.getPort(),
    host: '0.0.0.0',
    logger: {
        level: environmentService.getLogLevel(),
        transport: environmentService.get('LOG_FORMAT', 'pretty') === 'pretty'
            ? { target: 'pino-pretty' }
            : undefined
    },
    bodyLimit: parseFileSize(environmentService.get('FILE_SIZE_LIMIT', '104857600')) // Default to 100MB in bytes
};

// CORS configuration
const corsConfig = {
    origin: environmentService.isDevelopment()
        ? true // Allow all origins in development
        : environmentService.get('CORS_ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
};

module.exports = {
    CONFIG_DIR,
    CONFIG_FILE_PATH,
    getDefaultSnapshotsDir,
    getDefaultAnalyzerOutputDir,
    getDefaultLlmConfig,
    serverConfig,
    corsConfig,
    parseFileSize
}