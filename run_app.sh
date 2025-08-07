#!/bin/bash

# Gemma3n AI Explainer - Competition Setup Script
# This script sets up and runs both backend and frontend for the competition

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)     echo "linux";;
        Darwin*)    echo "macos";;
        CYGWIN*|MINGW*|MSYS*) echo "windows";;
        *)          echo "unknown";;
    esac
}

# Function to setup Ollama model
setup_ollama_model() {
    print_status "Setting up Ollama model..."
    
    # Check if ollama is installed
    if ! command_exists ollama; then
        print_error "Ollama is not installed. Please install Ollama first:"
        echo "  Visit: https://ollama.com/search"
        exit 1
    fi
    
    # Check if gemma3n model exists
    if ! ollama list | grep -q "gemma3n"; then
        print_status "Gemma3n model not found. Downloading appropriate model..."
        
        # Get CPU core count
        if [[ "$(uname -s)" == "Darwin" ]]; then
            CPU_CORES=$(sysctl -n hw.ncpu)
        else
            CPU_CORES=$(nproc)
        fi
        
        print_status "Detected $CPU_CORES CPU cores"
        
        # Download appropriate model based on CPU cores
        if [ "$CPU_CORES" -lt 6 ]; then
            print_status "Downloading gemma3n:e2b (optimized for <6 cores)..."
            ollama run gemma3n:e2b --verbose
            MODEL_VARIANT="gemma3n:e2b"
        else
            print_status "Downloading gemma3n:e4b (optimized for ≥6 cores)..."
            ollama run gemma3n:e4b --verbose
            MODEL_VARIANT="gemma3n:e4b"
        fi
    else
        print_success "Gemma3n model already exists"
        # Determine which variant is available
        if ollama list | grep -q "gemma3n:e4b"; then
            MODEL_VARIANT="gemma3n:e4b"
        elif ollama list | grep -q "gemma3n:e2b"; then
            MODEL_VARIANT="gemma3n:e2b"
        else
            MODEL_VARIANT="gemma3n:latest"
        fi
    fi
    
    print_success "Ollama model setup completed with variant: $MODEL_VARIANT"
}

# Function to setup backend
setup_backend() {
    print_status "Setting up backend..."
    
    cd v1
    
    # Check if uv is installed
    if ! command_exists uv; then
        print_error "uv is not installed. Please install uv first:"
        echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
        echo "  Or visit: https://docs.astral.sh/uv/getting-started/installation/"
        exit 1
    fi
    
    # Check if virtual environment already exists
    if [ ! -d ".venv" ]; then
        print_status "Creating virtual environment with uv..."
        uv venv --python 3.11
    else
        print_status "Virtual environment already exists, skipping creation..."
    fi
    
    # Activate virtual environment
    source .venv/bin/activate
    
    # Check if dependencies are already installed by checking for a key package
    if ! python -c "import fastapi" 2>/dev/null; then
        print_status "Installing backend dependencies..."
        uv pip install -r requirements.txt
    else
        print_status "Backend dependencies already installed, skipping installation..."
    fi
    
    # Setup Ollama model first
    cd ..
    setup_ollama_model
    cd v1
    
    # Create or update .env file with proper model configuration
    if [ ! -f ".env" ]; then
        print_status "Creating .env file with model configuration..."
        cat > .env << EOF
# AI/LLM Configuration
BASE_URL=http://localhost:11434/v1  # Ollama default URL
API_KEY=ollama
MODEL=$MODEL_VARIANT

# Server Configuration
PORT=8420

# Database Configuration
DATABASE_URL=sqlite:///./app.db

# Other configurations from env.example
EOF
        
        # Append any additional configurations from env.example that aren't covered above
        if [ -f "env.example" ]; then
            print_status "Adding additional configurations from env.example..."
            grep -v "^BASE_URL\|^API_KEY\|^MODEL\|^PORT\|^DATABASE_URL\|^#" env.example >> .env 2>/dev/null || true
        fi
    else
        print_status ".env file already exists, updating MODEL configuration..."
        # Update the MODEL line in existing .env file
        if grep -q "^MODEL=" .env; then
            sed -i.bak "s/^MODEL=.*/MODEL=$MODEL_VARIANT/" .env && rm -f .env.bak
        else
            echo "MODEL=$MODEL_VARIANT" >> .env
        fi
    fi
    
    print_success "Backend setup completed!"
    cd ..
}

# Function to setup frontend
setup_frontend() {
    print_status "Setting up frontend..."
    
    cd electron-app
    
    # Check if npm is installed
    if ! command_exists npm; then
        print_error "npm is not installed. Please install Node.js and npm first."
        exit 1
    fi
    
    # Check if node_modules already exists and has packages
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    else
        print_status "Frontend dependencies already installed, skipping installation..."
    fi
    
    print_success "Frontend setup completed!"
    cd ..
}

# Function to kill process on specific port
kill_port() {
    local port=$1
    print_status "Checking for existing processes on port $port..."
    
    # Find process using the port
    local pid=$(lsof -ti:$port 2>/dev/null)
    
    if [ -n "$pid" ]; then
        print_warning "Found process $pid using port $port. Killing it..."
        kill -9 $pid 2>/dev/null || true
        sleep 2
        
        # Verify the process is killed
        if lsof -ti:$port >/dev/null 2>&1; then
            print_error "Failed to kill process on port $port. Please manually kill it and try again."
            exit 1
        else
            print_success "Successfully freed port $port"
        fi
    else
        print_status "Port $port is available"
    fi
}

# Function to run backend
run_backend() {
    print_status "Starting backend server..."
    
    # Kill any existing process on port 8420
    kill_port 8420
    
    cd v1
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Activate virtual environment and run backend
    source .venv/bin/activate
    
    # Run backend in background with logging
    nohup python run_backend.py > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > logs/backend.pid
    
    # Wait a moment for server to start
    sleep 3
    
    # Check if backend is running
    if kill -0 $BACKEND_PID 2>/dev/null; then
        print_success "Backend server started successfully (PID: $BACKEND_PID)"
        print_status "Backend logs: v1/logs/backend.log"
        print_status "API Documentation: http://localhost:8420/docs"
        print_status "Health check: http://localhost:8420/api/health"
    else
        print_error "Failed to start backend server. Check logs/backend.log for details."
        exit 1
    fi
    
    cd ..
}

# Function to open browser (cross-platform)
open_browser() {
    local url=$1
    local os_type=$(detect_os)
    
    case $os_type in
        "linux")
            if command_exists xdg-open; then
                xdg-open "$url" >/dev/null 2>&1
            elif command_exists gnome-open; then
                gnome-open "$url" >/dev/null 2>&1
            elif command_exists firefox; then
                firefox "$url" >/dev/null 2>&1 &
            elif command_exists google-chrome; then
                google-chrome "$url" >/dev/null 2>&1 &
            elif command_exists chromium-browser; then
                chromium-browser "$url" >/dev/null 2>&1 &
            else
                print_warning "Could not automatically open browser. Please manually open: $url"
            fi
            ;;
        "macos")
            open "$url" >/dev/null 2>&1
            ;;
        "windows")
            if command_exists start; then
                start "$url" >/dev/null 2>&1
            elif command_exists cmd; then
                cmd /c start "$url" >/dev/null 2>&1
            elif command_exists powershell; then
                powershell -Command "Start-Process '$url'" >/dev/null 2>&1
            else
                print_warning "Could not automatically open browser. Please manually open: $url"
            fi
            ;;
        *)
            print_warning "Could not automatically open browser. Please manually open: $url"
            ;;
    esac
}

# Function to run frontend
run_frontend() {
    local os_type=$1
    print_status "Starting frontend for $os_type..."
    
    # Kill any existing process on port 3210 (for web version)
    if [ "$os_type" = "linux" ] || [ "$os_type" = "windows" ]; then
        kill_port 3210
    fi
    
    cd electron-app
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    case $os_type in
        "linux")
            print_status "Running web version for Linux..."
            nohup npm run dev:renderer > logs/frontend.log 2>&1 &
            FRONTEND_PID=$!
            echo $FRONTEND_PID > logs/frontend.pid
            
            # Wait for server to start
            print_status "Waiting for development server to start..."
            sleep 5
            
            # Check if frontend is running
            if kill -0 $FRONTEND_PID 2>/dev/null; then
                print_success "Frontend web server started successfully (PID: $FRONTEND_PID)"
                print_status "Frontend logs: electron-app/logs/frontend.log"
                print_status "Web app: http://localhost:3210"
                
                # Wait a bit more for the server to be fully ready
                sleep 3
                
                # Automatically open browser
                print_status "Opening web browser..."
                open_browser "http://localhost:3210"
                print_success "Browser should now open automatically. If not, manually visit: http://localhost:3210"
            else
                print_error "Failed to start frontend. Check logs/frontend.log for details."
                exit 1
            fi
            ;;
        "macos")
            print_status "Building and running Electron desktop app for macOS..."
            nohup npm run build:renderer && npm run build:electron > logs/frontend.log 2>&1 &
            FRONTEND_PID=$!
            echo $FRONTEND_PID > logs/frontend.pid
            
            # Wait longer for Electron app to build and start
            print_status "Waiting for Electron app to build and launch..."
            sleep 8
            
            if kill -0 $FRONTEND_PID 2>/dev/null; then
                print_success "Electron desktop app started successfully (PID: $FRONTEND_PID)"
                print_status "Frontend logs: electron-app/logs/frontend.log"
                print_success "The desktop application should now be visible on your screen."
                print_status "If the app doesn't appear, check the logs or try running 'npm run dev' manually in the electron-app directory."
            else
                print_error "Failed to start Electron app. Check logs/frontend.log for details."
                print_warning "You can try running 'npm run dev' manually in the electron-app directory."
                exit 1
            fi
            ;;
        "windows")
            print_status "Running web version for Windows..."
            nohup npm run dev:renderer > logs/frontend.log 2>&1 &
            FRONTEND_PID=$!
            echo $FRONTEND_PID > logs/frontend.pid
            
            # Wait for server to start
            print_status "Waiting for development server to start..."
            sleep 5
            
            # Check if frontend is running
            if kill -0 $FRONTEND_PID 2>/dev/null; then
                print_success "Frontend web server started successfully (PID: $FRONTEND_PID)"
                print_status "Frontend logs: electron-app/logs/frontend.log"
                print_status "Web app: http://localhost:3210"
                
                # Wait a bit more for the server to be fully ready
                sleep 3
                
                # Automatically open browser
                print_status "Opening web browser..."
                open_browser "http://localhost:3210"
                print_success "Browser should now open automatically. If not, manually visit: http://localhost:3210"
            else
                print_error "Failed to start frontend. Check logs/frontend.log for details."
                exit 1
            fi
            ;;
        *)
            print_error "Unsupported operating system: $os_type"
            exit 1
            ;;
    esac
    
    cd ..
}

# Function to stop services
stop_services() {
    print_status "Stopping services..."
    
    # Stop backend
    if [ -f "v1/logs/backend.pid" ]; then
        BACKEND_PID=$(cat v1/logs/backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            kill $BACKEND_PID
            print_success "Backend stopped (PID: $BACKEND_PID)"
        fi
        rm -f v1/logs/backend.pid
    fi
    
    # Stop frontend
    if [ -f "electron-app/logs/frontend.pid" ]; then
        FRONTEND_PID=$(cat electron-app/logs/frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            kill $FRONTEND_PID
            print_success "Frontend stopped (PID: $FRONTEND_PID)"
        fi
        rm -f electron-app/logs/frontend.pid
    fi
}

# Function to show logs
show_logs() {
    local service=$1
    case $service in
        "backend")
            if [ -f "v1/logs/backend.log" ]; then
                tail -f v1/logs/backend.log
            else
                print_error "Backend log file not found"
            fi
            ;;
        "frontend")
            if [ -f "electron-app/logs/frontend.log" ]; then
                tail -f electron-app/logs/frontend.log
            else
                print_error "Frontend log file not found"
            fi
            ;;
        *)
            print_error "Invalid service. Use 'backend' or 'frontend'"
            ;;
    esac
}

# Function to show status
show_status() {
    print_status "Service Status:"
    
    # Check backend
    if [ -f "v1/logs/backend.pid" ]; then
        BACKEND_PID=$(cat v1/logs/backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            print_success "Backend: Running (PID: $BACKEND_PID)"
        else
            print_warning "Backend: Not running (stale PID file)"
            rm -f v1/logs/backend.pid
        fi
    else
        print_warning "Backend: Not running"
    fi
    
    # Check frontend
    if [ -f "electron-app/logs/frontend.pid" ]; then
        FRONTEND_PID=$(cat electron-app/logs/frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            print_success "Frontend: Running (PID: $FRONTEND_PID)"
        else
            print_warning "Frontend: Not running (stale PID file)"
            rm -f electron-app/logs/frontend.pid
        fi
    else
        print_warning "Frontend: Not running"
    fi
}

# Main script logic
main() {
    echo "====================================="
    echo "  Gemma3n AI Explainer Setup Script"
    echo "====================================="
    echo
    
    # Detect OS
    OS_TYPE=$(detect_os)
    print_status "Detected OS: $OS_TYPE"
    
    case "${1:-}" in
        "setup")
            setup_backend
            setup_frontend
            print_success "Setup completed! Run './run_app.sh start' to start the application."
            ;;
        "start")
            run_backend
            run_frontend $OS_TYPE
            echo
            print_success "Application started successfully!"
            print_status "Use './run_app.sh status' to check service status"
            print_status "Use './run_app.sh logs [backend|frontend]' to view logs"
            print_status "Use './run_app.sh stop' to stop all services"
            ;;
        "stop")
            stop_services
            ;;
        "status")
            show_status
            ;;
        "logs")
            if [ -z "${2:-}" ]; then
                print_error "Please specify service: backend or frontend"
                exit 1
            fi
            show_logs "$2"
            ;;
        "restart")
            stop_services
            sleep 2
            run_backend
            run_frontend $OS_TYPE
            print_success "Application restarted successfully!"
            ;;
        "")
            # Default behavior: setup and start the application
            print_status "No command specified. Running setup and start automatically..."
            setup_backend
            setup_frontend
            run_backend
            run_frontend $OS_TYPE
            echo
            print_success "Application setup and started successfully!"
            print_status "Use './run_app.sh status' to check service status"
            print_status "Use './run_app.sh logs [backend|frontend]' to view logs"
            print_status "Use './run_app.sh stop' to stop all services"
            ;;
        *)
            echo "Usage: $0 [setup|start|stop|restart|status|logs]"
            echo
            echo "Commands:"
            echo "  (no args) - Setup and start the application (default)"
            echo "  setup     - Install dependencies and setup the application only"
            echo "  start     - Start both backend and frontend services only"
            echo "  stop      - Stop all running services"
            echo "  restart   - Restart all services"
            echo "  status    - Show status of all services"
            echo "  logs      - Show logs for a service (backend|frontend)"
            echo
            echo "Examples:"
            echo "  $0                # Setup and start (default)"
            echo "  $0 setup          # Setup only"
            echo "  $0 start          # Start only"
            echo "  $0 logs backend   # View backend logs"
            echo "  $0 logs frontend  # View frontend logs"
            exit 1
            ;;
    esac
}

# Trap to cleanup on script exit
trap 'echo; print_status "Script interrupted. Services may still be running. Use $0 stop to stop them."' INT TERM

# Run main function with all arguments
main "$@"