FROM python:3.11-slim

WORKDIR /app
COPY . .

# Generate mappings during build
RUN make generate-mappings

FROM debian:bookworm

# backports for recent osm2pgsqwl
RUN echo 'deb http://deb.debian.org/debian bookworm-backports main' > /etc/apt/sources.list.d/backports.list

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install osm2pgsql, osmium-tool, PostgreSQL client, Python and pip
RUN apt-get update && apt-get install -y -t bookworm-backports \
    osm2pgsql \
    osmium-tool \
    postgresql-client \
    tzdata \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python packages
COPY data-pipeline/requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Copy osm2pgsql scripts and lua files
COPY data-pipeline/run_osm2pgsql.sh ./
COPY data-pipeline/update_osm2pgsql.sh ./
COPY data-pipeline/prefilter_osm.sh ./
COPY data-pipeline/*.lua ./

# Make scripts executable
RUN chmod +x run_osm2pgsql.sh update_osm2pgsql.sh prefilter_osm.sh

# Create data directory
RUN mkdir -p /app/data

# Create non-root user
RUN useradd -m -u 1000 fourmore && chown -R fourmore:fourmore /app
USER fourmore

# Default command executes the osm2pgsql loader
CMD ["./run_osm2pgsql.sh"]
