// create a file named debug-json.js
const fs = require('fs').promises;
const path = require('path');

async function debugJsonFile(filePath) {
    try {
        // Read the file
        const content = await fs.readFile(filePath, 'utf8');

        console.log('=== File Information ===');
        console.log(`File path: ${filePath}`);
        console.log(`File size: ${content.length} characters`);

        // Check for BOM (Byte Order Mark)
        const hasBOM = content.charCodeAt(0) === 0xFEFF;
        console.log(`Has BOM: ${hasBOM}`);

        // Show the first several bytes in different formats
        console.log('\n=== First 50 characters ===');
        console.log(content.substring(0, 50));

        console.log('\n=== Character codes of first 20 characters ===');
        for (let i = 0; i < Math.min(20, content.length); i++) {
            console.log(`Position ${i}: ${content.charCodeAt(i)} (${content[i]})`);
        }

        // Try parsing with BOM removal
        console.log('\n=== Parsing attempt ===');
        try {
            const cleanedContent = content.replace(/^\uFEFF/, '');
            const parsed = JSON.parse(cleanedContent);
            console.log('Successfully parsed after BOM removal');
        } catch (parseErr) {
            console.log(`Parse error: ${parseErr.message}`);
            console.log(`Error position: around character ${parseErr.message.match(/position (\d+)/)?.[1] || 'unknown'}`);
        }
    } catch (err) {
        console.error(`Error reading file: ${err.message}`);
    }
}

// Usage
// Provide the path to one of the problematic files
if (process.argv.length < 3) {
    console.log('Please provide a file path to debug');
    console.log('Usage: node debug-json.js path/to/file.json');
    process.exit(1);
}

debugJsonFile(process.argv[2]);