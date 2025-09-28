FROM python:3.11-slim

# Install system dependencies including osmium and osm2pgsql
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libosmium2-dev \
    osmium-tool \
    osm2pgsql \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY data-pipeline/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared models and pipeline source code
COPY fourmore_shared ./fourmore_shared
COPY data-pipeline/legacy/ ./
COPY data-pipeline/*.sh ./
COPY data-pipeline/*.lua ./

# Create data directory
RUN mkdir -p /app/data

# Create non-root user
RUN useradd -m -u 1000 fourmore && chown -R fourmore:fourmore /app
USER fourmore

# Set working directory to src
WORKDIR /app

# Add current directory to Python path so fourmore_shared can be imported
ENV PYTHONPATH=/app:$PYTHONPATH

# Default command executes the osm2pgsql loader
CMD ["./run_osm2pgsql.sh"]
