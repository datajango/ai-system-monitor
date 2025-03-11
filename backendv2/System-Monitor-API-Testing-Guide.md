# System Monitor API Testing Guide

This guide provides instructions on how to test all endpoints of the System Monitor API using `curl`. The API is organized into different sections: System, Snapshots, Analyses, Models, and Settings.

## Prerequisites

- Make sure the System Monitor API is running on `http://localhost:3000` (or replace with your actual server URL)
- For authenticated endpoints, you'll need an authentication token (replace `your-token-here` with your actual token)
- The examples below use JSON formatting for better readability

## Common Options

- Add `-v` for verbose output
- Add `-i` to include response headers
- For endpoints that require authentication, add the following header:
  ```
  -H "Authorization: Bearer your-token-here"
  ```

## 1. System Endpoints

### Get System Status

```bash
curl -X GET http://localhost:3000/api/v1/system/status
```

### Get System Health

```bash
curl -X GET http://localhost:3000/api/v1/system/health
```

### Get Component Status

```bash
curl -X GET http://localhost:3000/api/v1/system/components
```

### Get System State

```bash
curl -X GET http://localhost:3000/api/v1/system/state
```

### Check Connections

```bash
curl -X GET http://localhost:3000/api/v1/system/connections
```

### Pause System

```bash
curl -X POST http://localhost:3000/api/v1/system/pause
```

### Resume System

```bash
curl -X POST http://localhost:3000/api/v1/system/resume
```

### Restart System (use with caution)

```bash
curl -X POST http://localhost:3000/api/v1/system/restart
```

### Terminate System (use with caution)

```bash
curl -X POST http://localhost:3000/api/v1/system/terminate
```

## 2. Snapshots Endpoints

### Get All Snapshots

```bash
curl -X GET http://localhost:3000/api/v1/snapshots
```

### Get Snapshot by ID

```bash
curl -X GET http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_12-00-00
```

### Create New Snapshot

```bash
curl -X POST http://localhost:3000/api/v1/snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test snapshot",
    "tags": ["test", "development"]
  }'
```

### Delete Snapshot

```bash
curl -X DELETE http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_12-00-00
```

### Get Snapshot Files

```bash
curl -X GET http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_12-00-00/files
```

### Get Specific File from Snapshot

```bash
curl -X GET http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_12-00-00/files/System.json
```

## 3. Analyses Endpoints

### Get All Analyses

```bash
curl -X GET http://localhost:3000/api/v1/analyses
```

### Get Analysis by ID

```bash
curl -X GET http://localhost:3000/api/v1/analyses/SystemState_2025-03-09_12-00-00
```

### Create New Analysis

```bash
curl -X POST http://localhost:3000/api/v1/analyses \
  -H "Content-Type: application/json" \
  -d '{
    "snapshotId": "SystemState_2025-03-09_12-00-00",
    "model": "gemma-2-9b-it",
    "sections": ["System", "Network", "Performance"],
    "depth": "standard"
  }'
```

### Delete Analysis

```bash
curl -X DELETE http://localhost:3000/api/v1/analyses/SystemState_2025-03-09_12-00-00
```

### Get Analysis Results

```bash
curl -X GET http://localhost:3000/api/v1/analyses/SystemState_2025-03-09_12-00-00/results
```

### Compare Analyses

```bash
curl -X POST http://localhost:3000/api/v1/analyses/compare \
  -H "Content-Type: application/json" \
  -d '{
    "baselineId": "SystemState_2025-03-08_12-00-00",
    "currentId": "SystemState_2025-03-09_12-00-00",
    "sections": ["System", "Performance"]
  }'
```

## 4. Models Endpoints

### Get All Models

```bash
curl -X GET http://localhost:3000/api/v1/models
```

### Get All Models (Force Refresh)

```bash
curl -X GET "http://localhost:3000/api/v1/models?refresh=true"
```

### Get Current Model

```bash
curl -X GET http://localhost:3000/api/v1/models/current
```

### Set Current Model

```bash
curl -X PUT http://localhost:3000/api/v1/models/current \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "gemma-2-9b-it"
  }'
```

### Update Model Parameters

```bash
curl -X PATCH http://localhost:3000/api/v1/models/params \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 0.7,
    "maxTokens": 4096
  }'
```

### Test Model

```bash
curl -X POST http://localhost:3000/api/v1/models/test \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "gemma-2-9b-it"
  }'
```

### Search Models

```bash
curl -X GET "http://localhost:3000/api/v1/models/search?query=gemma"
```

### Get Model Usage Stats

```bash
curl -X GET http://localhost:3000/api/v1/models/stats
```

### Test LLM Connection

```bash
curl -X POST http://localhost:3000/api/v1/models/connection/test \
  -H "Content-Type: application/json" \
  -d '{
    "serverUrl": "http://localhost:1234/v1",
    "model": "gemma-2-9b-it"
  }'
```

### Refresh Model Cache

```bash
curl -X POST http://localhost:3000/api/v1/models/refresh
```

## 5. Settings Endpoints

### Get All Settings

```bash
curl -X GET http://localhost:3000/api/v1/settings
```

### Get Specific Setting

```bash
curl -X GET http://localhost:3000/api/v1/settings/logLevel
```

### Update Setting

```bash
curl -X PUT http://localhost:3000/api/v1/settings/logLevel \
  -H "Content-Type: application/json" \
  -d '{
    "value": "info"
  }'
```

### Update Multiple Settings

```bash
curl -X PUT http://localhost:3000/api/v1/settings \
  -H "Content-Type: application/json" \
  -d '{
    "logLevel": "info",
    "llmTemperature": 0.8,
    "llmMaxTokens": 8192
  }'
```

### Reload Settings from .env

```bash
curl -X POST http://localhost:3000/api/v1/settings/reload
```

### Validate Settings

```bash
curl -X GET http://localhost:3000/api/v1/settings/validate
```

## Tips for Testing

1. **Save frequently used commands** as shell scripts or aliases for efficiency.
2. **Use jq to parse JSON responses**:
   ```bash
   curl -X GET http://localhost:3000/api/v1/system/status | jq
   ```
3. **Test flow sequences** - for example:

   - Create a snapshot
   - Use the returned ID to create an analysis
   - Get the analysis results
   - Delete the analysis and snapshot

4. **Error testing** - try invalid inputs to test error handling:

   ```bash
   # Testing with invalid model ID
   curl -X POST http://localhost:3000/api/v1/models/test \
     -H "Content-Type: application/json" \
     -d '{
       "modelId": "non-existent-model"
     }'
   ```

5. **Authentication testing** - try endpoints with and without authentication to verify security.
