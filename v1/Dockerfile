FROM python:3.12-slim
WORKDIR /code

# Install dependencies
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache --upgrade -r /code/requirements.txt

# Copy application code and .env file
COPY ./backend /code/backend
# COPY .env /code/.env

ENV PYTHONPATH=/code

# Add wait for database and initialize
CMD uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload --workers 4