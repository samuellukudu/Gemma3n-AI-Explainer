## Quick Start

**The Frontend has been fixed and it's working properly**

### Prerequisites

Before running the application, make sure you have the following installed:

1. **Python 3.11+** - [Download Python](https://www.python.org/downloads/)
2. **Node.js 20+ and npm** - [Download Node.js](https://nodejs.org/) (Recommended: Latest LTS version)
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
./run_app.sh       # Install all dependencies, setup and start the application both the backend and frontend
```

### Runtime Commands
```bash
./run_app.sh stop     # Stop all services
./run_app.sh restart  # Restart all services
./run_app.sh status   # Check service status
```

### Monitoring Commands
```bash
./run_app.sh logs backend   # View backend logs in real-time
./run_app.sh logs frontend  # View frontend logs in real-time
```
