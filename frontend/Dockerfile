# Multi-stage Dockerfile for React frontend
FROM --platform=linux/amd64 node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Development stage
FROM base AS development
RUN rm -rf node_modules package-lock.json
RUN npm install && npm cache clean --force
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

# Build stage
FROM base AS build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN rm -rf node_modules package-lock.json
RUN npm install && npm cache clean --force
RUN npm run build

# Production stage
FROM nginx:alpine AS production
# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Add labels for maintenance
LABEL maintainer="FourMore Team"
LABEL description="FourMore Frontend - React/Vite application"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]