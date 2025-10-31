FROM python:3.11-slim AS generator
WORKDIR /app
RUN pip install --no-cache-dir pyyaml
COPY fourmore_shared/ ./fourmore_shared/
COPY data-pipeline/ ./data-pipeline/
COPY frontend/src/ ./frontend/src/
RUN cd data-pipeline && \
    python3 src/validate_category_mapping.py && \
    python3 src/generate_category_ts.py

FROM node:18-alpine AS build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
WORKDIR /app

COPY frontend/package*.json ./
RUN npm install && npm cache clean --force

COPY frontend/ ./
COPY --from=generator /app/frontend/src/generated ./src/generated

RUN npm run build

FROM nginx:alpine AS production
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

LABEL maintainer="FourMore Team"
LABEL description="FourMore Frontend - React/Vite application"

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]