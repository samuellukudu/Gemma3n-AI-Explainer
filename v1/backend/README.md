# Gemma Hackathon Backend

A FastAPI backend for the Gemma Hackathon project with AI completion capabilities, caching, and a modular structure.

## Features

- **FastAPI Framework**: Modern, fast web framework for building APIs
- **AI Completions**: Integration with LLM models via OpenAI-compatible API
- **Caching**: LRU cache for performance optimization
- **CORS Support**: Cross-origin resource sharing enabled
- **Environment Configuration**: Flexible configuration via environment variables
- **API Documentation**: Automatic OpenAPI/Swagger documentation
- **Health Checks**: Built-in health monitoring endpoints
- **Flexible Instructions**: Support for different AI instruction types and custom instructions

## Project Structure

```
backend/
├── __init__.py
├── main.py              # FastAPI application entry point
├── config.py            # Configuration and settings
├── cache.py             # LRU cache implementation
├── instructions.py      # System instructions for AI
├── api/
│   ├── __init__.py
│   └── routes.py        # API route definitions
└── utils/
    ├── __init__.py
    └── generate_completions.py  # AI completion utilities
```

## Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Configuration**:
   Copy `env.example` to `.env` and configure your settings:
   ```bash
   cp env.example .env
   ```

3. **Required Environment Variables**:
   - `BASE_URL`: Your LLM API base URL (e.g., Ollama: `http://localhost:11434/v1`)
   - `API_KEY`: Your API key for the LLM service
   - `MODEL`: Model name to use (default: `gemma-2b-it`)

## Running the Backend

### Option 1: Using the startup script
```bash
python run_backend.py
```

### Option 2: Using Python module
```bash
python -m backend.main
```

### Option 3: Using uvicorn directly
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### Health Check
- `GET /` - Root endpoint with API info
- `GET /api/health` - Health check endpoint

### AI Completions
- `POST /api/completions` - Generate AI completions
- `POST /api/lessons` - Generate 5 structured lessons/guides for a query
- `POST /api/related-questions` - Generate 5 related questions for topic exploration

**Completions Request Body**:
```json
{
  "prompt": "Your prompt here",
  "instruction_type": "default",
  "instructions": "Optional custom instructions"
}
```

**Lessons Request Body**:
```json
{
  "query": "How does photosynthesis work?",
  "user_id": "optional_user_id"
}
```

**Related Questions Request Body**:
```json
{
  "query": "How does photosynthesis work?",
  "user_id": "optional_user_id"
}
```

**Available Instruction Types**:
- `default` - General helpful assistant for understanding complex topics
- `exploration` - For exploring and understanding various topics
- `technical` - For explaining technical concepts
- `creative` - For creative thinking and idea exploration
- `lessons` - For generating structured learning guides and lessons
- `related_questions` - For generating related questions for topic exploration

**Response**:
```json
{
  "response": "AI generated response",
  "success": true
}
```

### Instructions Management
- `GET /api/instructions` - Get available instruction types and default instruction

**Response**:
```json
{
  "available_types": ["default", "exploration", "technical", "creative"],
  "default_instruction": "You are a helpful AI assistant..."
}
```

### Cache Management
- `GET /api/cache/stats` - Get cache statistics
- `DELETE /api/cache/clear` - Clear the cache

## API Documentation

Once the server is running, you can access:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Configuration

The backend uses a centralized configuration system in `config.py`. Key settings:

- **Server**: Host, port, debug mode
- **AI/LLM**: Base URL, API key, model name
- **Cache**: Maximum cache size
- **CORS**: Allowed origins
- **Security**: Secret key

## Instructions System

The backend includes a flexible instructions system in `instructions.py`:

### Default Instruction
The default instruction focuses on helping people understand complex topics with clear, structured explanations.

### Custom Instructions
You can provide custom instructions in API requests or use predefined instruction types for different use cases.

### Adding New Instructions
To add new instruction types, edit `backend/instructions.py` and add new constants and update the `INSTRUCTIONS` dictionary.

## Development

### Adding New Endpoints

1. Add new routes in `api/routes.py`
2. Use the existing router or create new ones
3. Follow the established patterns for request/response models

### Testing

Run the test script to verify the API setup:
```bash
python test_backend.py
```

### Code Style

Follow PEP 8 guidelines and use type hints throughout the codebase. All imports use absolute paths with the `backend.` prefix.

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**: Ensure `BASE_URL` and `API_KEY` are set
2. **Port Already in Use**: Change the `PORT` in your `.env` file
3. **CORS Issues**: Configure `CORS_ORIGINS` properly for your frontend
4. **Import Errors**: Make sure you're running from the project root directory

### Logs

The server runs with info-level logging by default. Check the console output for any errors or warnings. 