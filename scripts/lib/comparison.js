const fs = require('fs');
const path = require('path');

/**
 * Compare snapshots from filesystem and API
 * @param {Array} fsSnapshots - Filesystem snapshots
 * @param {Array} apiSnapshots - API snapshots
 * @param {Object} config - Configuration object
 * @param {Object} logger - Logger utility
 * @returns {Object} Comparison results
 */
function compareSnapshots(fsSnapshots, apiSnapshots, config, logger) {
    logger.info('Comparing snapshots...');

    const results = {
        matchingSnapshots: [],
        missingInApi: [],
        missingInFs: [],
        fileComparisons: []
    };

    // Create maps for easier lookup
    const fsSnapshotsMap = new Map(fsSnapshots.map(s => [s.id, s]));
    const apiSnapshotsMap = new Map(apiSnapshots.map(s => [s.id, s]));

    // Find snapshots missing in API
    for (const [id, snapshot] of fsSnapshotsMap) {
        if (!apiSnapshotsMap.has(id)) {
            results.missingInApi.push(id);
        } else {
            results.matchingSnapshots.push(id);
        }
    }

    // Find snapshots missing in filesystem
    for (const [id, snapshot] of apiSnapshotsMap) {
        if (!fsSnapshotsMap.has(id)) {
            results.missingInFs.push(id);
        }
    }

    // Compare matching snapshots
    for (const id of results.matchingSnapshots) {
        const fsSnapshot = fsSnapshotsMap.get(id);
        const apiSnapshot = apiSnapshotsMap.get(id);

        // Create file maps for comparison
        const fsFilesMap = new Map(fsSnapshot.files.map(f => [f.name, f]));
        const apiFilesMap = new Map(apiSnapshot.files.map(f => [f.name, f]));

        const fileComparison = {
            snapshotId: id,
            matchingFiles: [],
            missingInApi: [],
            missingInFs: [],
            contentDifferences: []
        };

        // Check files present in filesystem
        for (const [fileName, fileInfo] of fsFilesMap) {
            if (!apiFilesMap.has(fileName)) {
                fileComparison.missingInApi.push(fileName);
            } else {
                fileComparison.matchingFiles.push(fileName);

                // Compare content if available
                const apiFileInfo = apiFilesMap.get(fileName);

                if (fileInfo.content && apiFileInfo.content) {
                    // Compare content with more detailed diff information
                    const diff = compareJsonContent(fileInfo.content, apiFileInfo.content, fileName);

                    if (diff) {
                        fileComparison.contentDifferences.push({
                            fileName,
                            fsSize: fileInfo.size,
                            apiSize: apiFileInfo.size,
                            diff
                        });

                        // Create diff directory if needed
                        const diffDir = path.join(config.OUTPUT_DIR, 'diffs', id);
                        if (!fs.existsSync(diffDir)) {
                            fs.mkdirSync(diffDir, { recursive: true });
                        }

                        // Save detailed diffs for inspection
                        fs.writeFileSync(
                            path.join(diffDir, `${fileName}.diff.json`),
                            JSON.stringify({
                                differences: diff,
                                fsContent: fileInfo.content,
                                apiContent: apiFileInfo.content
                            }, null, 2)
                        );
                    }
                }
            }
        }

        // Check files present in API but not in filesystem
        for (const [fileName, fileInfo] of apiFilesMap) {
            if (!fsFilesMap.has(fileName)) {
                fileComparison.missingInFs.push(fileName);
            }
        }

        results.fileComparisons.push(fileComparison);
    }

    return results;
}

/**
 * Compare JSON content with detailed difference information
 * @param {Object} fsContent - Filesystem content
 * @param {Object} apiContent - API content
 * @param {string} fileName - File name
 * @returns {Object|null} Differences or null if identical
 */
function compareJsonContent(fsContent, apiContent, fileName) {
    try {
        // Normalize both contents to handle formatting differences
        const fsNormalized = normalizeJson(fsContent);
        const apiNormalized = normalizeJson(apiContent);

        if (fsNormalized === apiNormalized) {
            return null; // No differences
        }

        // If differences exist, find specific differences
        return findDifferences(fsContent, apiContent);
    } catch (error) {
        return {
            error: `Error comparing files: ${error.message}`,
            fsType: typeof fsContent,
            apiType: typeof apiContent
        };
    }
}

/**
 * Helper function to normalize JSON for comparison
 * @param {Object} obj - Object to normalize
 * @returns {string} Normalized JSON string
 */
function normalizeJson(obj) {
    return JSON.stringify(sortObjectKeys(obj));
}

/**
 * Helper function to sort object keys
 * @param {Object} obj - Object to sort keys
 * @returns {Object} Object with sorted keys
 */
function sortObjectKeys(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
    }

    return Object.keys(obj).sort().reduce((sorted, key) => {
        sorted[key] = sortObjectKeys(obj[key]);
        return sorted;
    }, {});
}

/**
 * Helper function to find differences between objects
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @param {string} path - Current path (for recursion)
 * @returns {Array} Array of differences
 */
function findDifferences(obj1, obj2, path = '') {
    const differences = [];

    // Handle null values
    if (obj1 === null || obj2 === null) {
        if (obj1 !== obj2) {
            differences.push({
                path: path || '(root)',
                type1: obj1 === null ? 'null' : typeof obj1,
                type2: obj2 === null ? 'null' : typeof obj2,
                value1: obj1,
                value2: obj2
            });
        }
        return differences;
    }

    // Handle different types
    if (typeof obj1 !== typeof obj2) {
        differences.push({
            path: path || '(root)',
            type1: typeof obj1,
            type2: typeof obj2,
            value1: obj1,
            value2: obj2
        });
        return differences;
    }

    // For non-objects, direct comparison
    if (typeof obj1 !== 'object') {
        if (obj1 !== obj2) {
            differences.push({
                path: path || '(root)',
                value1: obj1,
                value2: obj2
            });
        }
        return differences;
    }

    // Handle arrays
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
        if (obj1.length !== obj2.length) {
            differences.push({
                path: path || '(root)',
                issue: 'array_length',
                length1: obj1.length,
                length2: obj2.length
            });
        }

        // Check array elements (up to the shorter length)
        const minLength = Math.min(obj1.length, obj2.length);
        for (let i = 0; i < minLength; i++) {
            const elementDiffs = findDifferences(obj1[i], obj2[i], `${path}[${i}]`);
            differences.push(...elementDiffs);
        }

        return differences;
    }

    // Handle objects
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    // Find keys unique to each object
    const uniqueKeys1 = keys1.filter(k => !keys2.includes(k));
    const uniqueKeys2 = keys2.filter(k => !keys1.includes(k));

    if (uniqueKeys1.length > 0) {
        differences.push({
            path: path || '(root)',
            issue: 'missing_keys_in_api',
            keys: uniqueKeys1
        });
    }

    if (uniqueKeys2.length > 0) {
        differences.push({
            path: path || '(root)',
            issue: 'missing_keys_in_filesystem',
            keys: uniqueKeys2
        });
    }

    // Check common keys
    const commonKeys = keys1.filter(k => keys2.includes(k));
    for (const key of commonKeys) {
        const propertyDiffs = findDifferences(obj1[key], obj2[key], path ? `${path}.${key}` : key);
        differences.push(...propertyDiffs);
    }

    return differences;
}

module.exports = {
    compareSnapshots,
    compareJsonContent,
    normalizeJson,
    sortObjectKeys,
    findDifferences
};