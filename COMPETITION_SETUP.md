# Gemma3n AI Explainer - Competition Setup Guide

This guide will help you quickly set up and run the Gemma3n AI Explainer application for the competition.

## Quick Start

### Prerequisites

Before running the application, make sure you have the following installed:

1. **Python 3.11+** - [Download Python](https://www.python.org/downloads/)
2. **Node.js and npm** - [Download Node.js](https://nodejs.org/)
3. **uv** (Python package manager) - [Install uv](https://docs.astral.sh/uv/getting-started/installation/)
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```
4. **Ollama** (Local LLM runtime) - [Download Ollama](https://ollama.ai/download)
   - The setup script will automatically download the appropriate Gemma3n model based on your CPU cores
   - **<6 CPU cores**: Downloads `gemma3n:e2b` (~4GB)
   - **≥6 CPU cores**: Downloads `gemma3n:e4b` (~7.5GB)
   - Make sure you have sufficient disk space for the model

### One-Command Setup and Run

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd Gemma3n-AI-Explainer
   ```

2. **Setup the application (first time only):**
   ```bash
   ./run_app.sh setup
   ```

3. **Start the application:**
   ```bash
   ./run_app.sh start
   ```

That's it! The application will start automatically based on your operating system:
- **Linux**: Web version at http://localhost:3000
- **macOS/Windows**: Electron desktop app

## Script Commands

The `run_app.sh` script provides several useful commands:

### Setup Commands
```bash
./run_app.sh setup    # Install all dependencies and setup the application
```

### Runtime Commands
```bash
./run_app.sh start    # Start both backend and frontend
./run_app.sh stop     # Stop all services
./run_app.sh restart  # Restart all services
./run_app.sh status   # Check service status
```

### Monitoring Commands
```bash
./run_app.sh logs backend   # View backend logs in real-time
./run_app.sh logs frontend  # View frontend logs in real-time
```

## What the Script Does

### Backend Setup
1. **Ollama Model Management**: Automatically checks for and downloads the appropriate Gemma3n model
   - Detects your CPU core count
   - Downloads `gemma3n:e2b` for systems with <6 cores
   - Downloads `gemma3n:e4b` for systems with ≥6 cores
   - Skips download if model already exists
2. Creates a Python virtual environment using `uv`
3. Installs all Python dependencies from `requirements.txt`
4. Creates `.env` configuration file with proper model settings:
   - `BASE_URL=http://localhost:11434/v1` (Ollama API)
   - `API_KEY=ollama`
   - `MODEL=gemma3n:e4b` or `gemma3n:e2b` (based on your system)
   - `PORT=8420`
5. Starts the FastAPI backend server on port 8420
6. Logs all backend output to `v1/logs/backend.log`

### Frontend Setup
1. Installs all Node.js dependencies using `npm`
2. Starts the appropriate frontend based on your OS:
   - **Linux**: Vite development server (web version)
   - **macOS**: Electron desktop application
   - **Windows**: Electron desktop application
3. Logs all frontend output to `electron-app/logs/frontend.log`

## Platform-Specific Behavior

### Linux
- Runs the web version of the application
- Access at: http://localhost:3000
- Backend API: http://localhost:8420

### macOS
- Runs the Electron desktop application
- Native macOS app window will open automatically
- Backend API: http://localhost:8420

### Windows
- Runs the Electron desktop application
- Native Windows app window will open automatically
- Backend API: http://localhost:8420

## Log Files

All application output is logged to keep your terminal clean:

- **Backend logs**: `v1/logs/backend.log`
- **Frontend logs**: `electron-app/logs/frontend.log`

Use the `logs` command to monitor them in real-time:
```bash
./run_app.sh logs backend   # Monitor backend
./run_app.sh logs frontend  # Monitor frontend
```

## Service Management

### Check Status
```bash
./run_app.sh status
```
This shows whether services are running and their process IDs.

### Stop Services
```bash
./run_app.sh stop
```
This cleanly stops both backend and frontend services.

### Restart Services
```bash
./run_app.sh restart
```
This stops and starts all services with a clean restart.

## Configuration

### Backend Configuration
The backend configuration is in `v1/.env`. Key settings:
- `PORT=8420` - Backend server port
- `BASE_URL` - AI model API endpoint
- `API_KEY` - AI model API key
- `MODEL` - AI model to use

### Frontend Configuration
The frontend automatically connects to the backend on port 8420. No additional configuration needed.

## Troubleshooting

### Common Issues

1. **"uv not found" error**
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   source ~/.bashrc  # or restart terminal
   ```

2. **"npm not found" error**
   - Install Node.js from https://nodejs.org/

3. **"ollama not found" error**
   - Install Ollama from https://ollama.ai/download
   - Make sure Ollama service is running: `ollama serve`

4. **Model download issues**
   - Ensure you have sufficient disk space (4-8GB for models)
   - Check internet connection for model download
   - Manually download model: `ollama run gemma3n:e4b` or `ollama run gemma3n:e2b`

5. **Ollama connection errors**
   - Verify Ollama is running: `ollama list`
   - Check if Ollama service is accessible: `curl http://localhost:11434/api/version`
   - Restart Ollama service if needed

6. **Port already in use**
   - Stop other services using ports 3000, 8420, or 11434 (Ollama)
   - Or use `./run_app.sh stop` to stop our services

7. **Services not starting**
   - Check logs: `./run_app.sh logs backend` or `./run_app.sh logs frontend`
   - Ensure all prerequisites are installed
   - Verify Ollama model is properly downloaded: `ollama list`

### Getting Help

1. **Check service status**: `./run_app.sh status`
2. **View logs**: `./run_app.sh logs [backend|frontend]`
3. **Restart services**: `./run_app.sh restart`

## API Endpoints

Once running, you can access:
- **API Documentation**: http://localhost:8420/docs
- **Health Check**: http://localhost:8420/api/health
- **Performance Metrics**: http://localhost:8420/api/performance/metrics

## Development

For development purposes, you can also run services individually:

### Backend Only
```bash
cd v1
source .venv/bin/activate
python run_backend.py
```

### Frontend Only
```bash
cd electron-app

# For web version only
npm run dev:renderer

# For full Electron app (includes both renderer and electron)
npm run dev
```

## Competition Notes

- The script automatically detects your operating system and runs the appropriate version
- All logs are captured to files to keep the terminal clean
- Services run in the background, allowing you to use the terminal for other tasks
- The setup process is automated and requires minimal user intervention
- Both backend and frontend are optimized for offline usage after initial setup

---

**Happy coding! 🚀**