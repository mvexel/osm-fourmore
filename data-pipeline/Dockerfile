FROM debian:bookworm

# backports for recent osm2pgsqwl
RUN echo 'deb http://deb.debian.org/debian bookworm-backports main' > /etc/apt/sources.list.d/backports.list

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install osm2pgsql and PostgreSQL client
RUN apt-get update && apt-get install -y -t bookworm-backports \
    osm2pgsql \
    postgresql-client \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy osm2pgsql script and lua files
COPY data-pipeline/run_osm2pgsql.sh ./
COPY data-pipeline/*.lua ./

# Make script executable
RUN chmod +x run_osm2pgsql.sh

# Create data directory
RUN mkdir -p /app/data

# Create non-root user
RUN useradd -m -u 1000 fourmore && chown -R fourmore:fourmore /app
USER fourmore

# Default command executes the osm2pgsql loader
CMD ["./run_osm2pgsql.sh"]
