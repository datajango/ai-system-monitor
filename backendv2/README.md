# System Monitor Backend v2

A refactored backend for the System State Monitor and Analyzer application.

## Overview

This is a complete rewrite of the original backend with improved architecture, better separation of concerns, and enhanced functionality. The application collects, analyzes, and compares system state snapshots using LLM (Language Model) integration for intelligent insights.

## Features

- **System Operations**: Status monitoring, system control (restart, pause, terminate)
- **Snapshot Management**: Create, retrieve, and delete system snapshots
- **Analysis**: Generate intelligent analyses of system state using LLMs
- **Model Management**: Configure and test different LLM models
- **Settings Management**: Configure application settings

## Architecture

The application follows a layered architecture with clear separation of concerns:

- **Routes**: Define API endpoints and request validation
- **Controllers**: Handle request processing and response formatting
- **Services**: Implement business logic
- **Utilities**: Provide helper functions

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`
4. Start the server:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## API Documentation

Once the server is running, you can access the Swagger API documentation at:

```
http://localhost:3000/docs
```

## API Endpoints

### System Operations

- `GET /api/v1/system/status` - Get system status
- `GET /api/v1/system/health` - Get system health check
- `POST /api/v1/system/restart` - Restart the system
- `POST /api/v1/system/pause` - Pause background operations
- `POST /api/v1/system/resume` - Resume background operations
- `POST /api/v1/system/terminate` - Terminate the system

### Snapshots

- `GET /api/v1/snapshots` - Get all snapshots
- `GET /api/v1/snapshots/:id` - Get a specific snapshot
- `POST /api/v1/snapshots` - Create a new snapshot
- `DELETE /api/v1/snapshots/:id` - Delete a snapshot
- `GET /api/v1/snapshots/:id/files` - Get all files in a snapshot
- `GET /api/v1/snapshots/:id/files/:filename` - Get a specific file from a snapshot

### Analyses

- `GET /api/v1/analyses` - Get all analyses
- `GET /api/v1/analyses/:id` - Get a specific analysis
- `POST /api/v1/analyses` - Create a new analysis
- `DELETE /api/v1/analyses/:id` - Delete an analysis
- `GET /api/v1/analyses/:id/results` - Get detailed results for an analysis
- `POST /api/v1/analyses/compare` - Compare two analyses

### Models

- `GET /api/v1/models` - Get all available models
- `GET /api/v1/models/current` - Get the current model
- `PUT /api/v1/models/current` - Set the current model
- `PATCH /api/v1/models/params` - Update model parameters
- `POST /api/v1/models/test` - Test model connection
- `GET /api/v1/models/stats` - Get model usage statistics
- `POST /api/v1/models/connection/test` - Test LLM server connection

### Settings

- `GET /api/v1/settings` - Get all settings
- `GET /api/v1/settings/:key` - Get a specific setting
- `PUT /api/v1/settings/:key` - Update a specific setting
- `PUT /api/v1/settings` - Update multiple settings
- `POST /api/v1/settings/reload` - Reload settings from .env file
- `GET /api/v1/settings/validate` - Validate settings

## Configuration

The application is configured through environment variables. See `.env.example` for available options.

## License

MIT
