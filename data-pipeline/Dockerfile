FROM python:3.11-slim AS generator
WORKDIR /app
RUN pip install --no-cache-dir pyyaml
COPY fourmore_shared/ ./fourmore_shared/
COPY data-pipeline/ ./data-pipeline/
RUN cd data-pipeline && \
    python3 src/validate_category_mapping.py && \
    python3 src/generate_poi_mapping.py

FROM debian:bookworm

RUN echo 'deb http://deb.debian.org/debian bookworm-backports main' > /etc/apt/sources.list.d/backports.list

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

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

WORKDIR /app

COPY data-pipeline/requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

COPY --from=generator /app/data-pipeline/poi_mapping.lua ./
COPY data-pipeline/run_osm2pgsql.sh ./
COPY data-pipeline/update_osm2pgsql.sh ./
COPY data-pipeline/prefilter_osm.sh ./
COPY data-pipeline/*.lua ./

RUN chmod +x run_osm2pgsql.sh update_osm2pgsql.sh prefilter_osm.sh
RUN mkdir -p /app/data
RUN useradd -m -u 1000 fourmore && chown -R fourmore:fourmore /app
USER fourmore

CMD ["./run_osm2pgsql.sh"]