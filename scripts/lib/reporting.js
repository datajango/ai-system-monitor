const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

/**
 * Generate comparison report
 * @param {Object} comparisonResults - Comparison results
 * @param {Object} config - Configuration object
 * @param {Object} logger - Logger utility
 * @returns {Promise<void>}
 */
async function generateReport(comparisonResults, config, logger) {
  logger.info('Generating report...');

  // Create a summary of the results
  const summary = {
    totalSnapshots: {
      filesystem: comparisonResults.matchingSnapshots.length + comparisonResults.missingInApi.length,
      api: comparisonResults.matchingSnapshots.length + comparisonResults.missingInFs.length,
      matching: comparisonResults.matchingSnapshots.length
    },
    snapshotsDetails: {
      matchingSnapshots: comparisonResults.matchingSnapshots,
      missingInApi: comparisonResults.missingInApi,
      missingInFs: comparisonResults.missingInFs
    },
    fileIssues: comparisonResults.fileComparisons.reduce((total, comparison) => {
      return total +
        comparison.missingInApi.length +
        comparison.missingInFs.length +
        comparison.contentDifferences.length;
    }, 0),
    fileComparisons: comparisonResults.fileComparisons.map(fc => ({
      snapshotId: fc.snapshotId,
      matchingFiles: fc.matchingFiles.length,
      missingInApi: fc.missingInApi,
      missingInFs: fc.missingInFs,
      contentDifferences: fc.contentDifferences.map(diff => diff.fileName)
    }))
  };

  // Generate HTML report using EJS templates
  const htmlReport = await renderHtmlReport(summary, comparisonResults);

  // Save reports
  fs.writeFileSync(
    path.join(config.OUTPUT_DIR, 'comparison-summary.json'),
    JSON.stringify(summary, null, 2)
  );

  fs.writeFileSync(
    path.join(config.OUTPUT_DIR, 'comparison-details.json'),
    JSON.stringify(comparisonResults, null, 2)
  );

  fs.writeFileSync(
    path.join(config.OUTPUT_DIR, 'comparison-report.html'),
    htmlReport
  );

  // Print summary
  logger.result(`Snapshot Comparison Summary:`);
  logger.result(`- Total snapshots in filesystem: ${summary.totalSnapshots.filesystem}`);
  logger.result(`- Total snapshots in API: ${summary.totalSnapshots.api}`);
  logger.result(`- Matching snapshots: ${summary.totalSnapshots.matching}`);
  logger.result(`- Snapshots missing in API: ${comparisonResults.missingInApi.length}`);
  logger.result(`- Snapshots missing in filesystem: ${comparisonResults.missingInFs.length}`);
  logger.result(`- Total file issues found: ${summary.fileIssues}`);

  // Print detailed issues if any
  if (summary.fileIssues > 0) {
    printDetailedIssues(comparisonResults, logger);
  }

  logger.success(`Reports saved to ${config.OUTPUT_DIR}`);
  logger.success(`Detailed API responses saved to ${config.API_SNAPSHOTS_DIR}`);
  logger.success(`Filesystem content saved to ${config.FS_SNAPSHOTS_DIR}`);
  logger.success(`To view the HTML report, open: ${path.resolve(path.join(config.OUTPUT_DIR, 'comparison-report.html'))}`);
}

/**
 * Print detailed issues to console
 * @param {Object} comparisonResults - Comparison results
 * @param {Object} logger - Logger utility
 */
function printDetailedIssues(comparisonResults, logger) {
  logger.result(`\nDetailed File Issues:`);

  comparisonResults.fileComparisons.forEach(comparison => {
    const hasIssues = comparison.missingInApi.length +
      comparison.missingInFs.length +
      comparison.contentDifferences.length;

    if (hasIssues > 0) {
      logger.result(`\nSnapshot: ${comparison.snapshotId}`);

      if (comparison.missingInApi.length > 0) {
        logger.warning(`  Files missing in API: ${comparison.missingInApi.join(', ')}`);
      }

      if (comparison.missingInFs.length > 0) {
        logger.warning(`  Files missing in filesystem: ${comparison.missingInFs.join(', ')}`);
      }

      if (comparison.contentDifferences.length > 0) {
        logger.error(`  Files with content differences: ${comparison.contentDifferences.map(d => d.fileName).join(', ')}`);
      }
    }
  });
}

/**
 * Render HTML report using EJS template
 * @param {Object} summary - Report summary
 * @param {Object} details - Detailed comparison results
 * @returns {Promise<string>} HTML content
 */
async function renderHtmlReport(summary, details) {
  const templatePath = path.join(__dirname, '..', 'templates', 'report.ejs');

  try {
    // Render the main template with includes
    return await ejs.renderFile(templatePath, {
      summary,
      details,
      // Create helpers that EJS can use
      helpers: {
        formatNumber: (num) => num.toLocaleString(),
        formatBytes: (bytes) => {
          if (bytes < 1024) return `${bytes} bytes`;
          if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KB`;
          return `${(bytes / 1048576).toFixed(2)} MB`;
        }
      }
    }, {
      // Set EJS options
      root: path.join(__dirname, '..', 'templates')
    });
  } catch (error) {
    throw new Error(`Error rendering HTML report: ${error.message}`);
  }
}

module.exports = { generateReport };