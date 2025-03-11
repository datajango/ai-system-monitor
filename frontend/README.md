# System Monitor Web Application

A modern web interface for the System State Monitor and Analyzer tools.

## Project Structure

This project consists of two main parts:

1. **Backend API (Node.js/Fastify)**: Provides endpoints to interact with the System State Monitor and Analyzer tools.
2. **Frontend (React/Vite)**: A responsive web interface for visualizing and interacting with system snapshots and analysis.

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 8.x or higher
- PowerShell 5.1 or higher (for Windows system monitoring)
- Python 3.8 or higher (for system analysis)
- The original System State Monitor and Analyzer tools

### Setup

1. Clone the repository:

```bash
git clone https://github.com/datjango/ai-system-monitor.git
cd ai-system-monitor
```

2. Install backend dependencies:

```bash
cd backend
npm install
```

3. Install frontend dependencies:

```bash
cd ../frontend
npm install
```

### Running the Application

#### Start the Backend Server

```bash
cd backend
npm run dev
```

The backend will be available at http://localhost:3000.

#### Start the Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will be available at http://localhost:5173.

## Backend API Endpoints

### System Endpoints

- `GET /api/v1/system/snapshots` - Get all system snapshots
- `GET /api/v1/system/snapshots/:id` - Get a specific snapshot by ID
- `GET /api/v1/system/analysis/:id` - Get analysis for a specific snapshot
- `POST /api/v1/system/collect` - Run a new system snapshot collection
- `POST /api/v1/system/analyze/:id` - Run analysis on a snapshot
- `POST /api/v1/system/compare` - Compare two snapshots

### Configuration Endpoints

- `GET /api/v1/config` - Get current analyzer configuration
- `PUT /api/v1/config` - Update analyzer configuration
- `GET /api/v1/config/models` - Get available LLM models
- `POST /api/v1/config/test-llm-connection` - Test LLM server connection

## Frontend Features

- **Dashboard**: Overview of system monitoring status and recent snapshots
- **Snapshots**: View and manage system snapshots
- **Analysis**: Run LLM-powered analysis on system snapshots
- **Configuration**: Configure LLM server settings and analysis parameters

## Architecture

### Backend

The backend uses a modular architecture:

- **Routes**: Define API endpoints and validation
- **Controllers**: Handle request processing
- **Services**: Implement business logic
- **Utils**: Provide helper functions

### Frontend

The frontend follows a modern React application structure:

- **Components**: Reusable UI components
- **Pages**: Main application views
- **Services**: API communication layer
- **Context**: Application state management
- **Hooks**: Custom React hooks

## Building for Production

### Backend

```bash
cd backend
npm run build
```

### Frontend

```bash
cd frontend
npm run build
```

The frontend build will be available in the `frontend/dist` directory.

## Technologies Used

### Backend

- Node.js
- Fastify
- Pino (logging)
- Fastify Swagger (API documentation)

### Frontend

- React 19
- TypeScript
- Vite
- TailwindCSS
- React Router
- Tanstack React Query
- Lucide React (icons)
- Headless UI
- Sonner (toast notifications)

## License

MIT
