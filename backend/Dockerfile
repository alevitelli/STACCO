FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Set environment variables
ENV PYTHONPATH=/app

# Add Railway's port as a build argument
ARG PORT
ENV PORT=${PORT:-8000}

# Create an entrypoint script that properly handles the PORT variable
RUN echo '#!/bin/bash\n\
cd /app && \
uvicorn api.main:app --host 0.0.0.0 --port ${PORT} --forwarded-allow-ips "*"' > /app/entrypoint.sh \
    && chmod +x /app/entrypoint.sh

# Use the entrypoint script
CMD ["/app/entrypoint.sh"]