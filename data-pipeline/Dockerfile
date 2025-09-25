FROM python:3.11-slim

# Install system dependencies including osmium
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libosmium2-dev \
    osmium-tool \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY data-pipeline/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY data-pipeline/src/ ./src/

# Create data directory
RUN mkdir -p /app/data

# Create non-root user
RUN useradd -m -u 1000 fourmore && chown -R fourmore:fourmore /app
USER fourmore

# Set working directory to src
WORKDIR /app/src

# Default command
CMD ["python", "pipeline.py", "--help"]