# System Monitor Scripts

This directory contains utility scripts for testing and managing the System Monitor application.

## Setup

Before running the scripts, install the required dependencies:

```bash
npm install
```

## Available Scripts

### API Testing

Test all backend API endpoints to ensure they are functioning correctly:

```bash
npm run test:api
```

This script will:

- Test all API endpoints
- Create a test snapshot
- Run analysis on the snapshot
- Compare snapshots if multiple are available
- Test configuration endpoints
- Provide a summary of results

## Adding New Scripts

1. Create your script file in this directory
2. Add a corresponding npm script in the `package.json` file
3. Update this README with details about your script

## Requirements

- Node.js 16+
- A running backend server (default: http://localhost:3000)

## Running the debig-json.js script

```bash
ts-node scipts/debug-json.ts /d/Snapshots/SystemState_2025-03-08_10-59-51/Browsers.json
```
