FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Copy environment files (if they exist)
# .env provides defaults, .env.local (if present) overrides them
COPY .env* ./

# Copy application code
COPY backend/app/ ./app/
COPY fourmore_shared/ ./fourmore_shared/
COPY data-pipeline/category_mapping.json ./data-pipeline/

# Create non-root user
RUN useradd -m -u 1000 fourmore && chown -R fourmore:fourmore /app
USER fourmore

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--access-logfile", "-", "--error-logfile", "-", "app.main:app"]
