#!/bin/bash

echo "🚀 Starting FourMore (MVP setup)"
echo "==============================="

# Start database services
echo "Starting database services..."
docker compose up -d postgres redis

echo "Waiting for database to be ready..."
sleep 5

# Check if backend directory exists and has requirements
if [ -d "backend" ]; then
    echo "Starting backend..."
    cd backend
    if [ -f "requirements.txt" ]; then
        # Create virtual environment if it doesn't exist
        if [ ! -d "venv" ]; then
            python3 -m venv venv
        fi
        source venv/bin/activate
        pip install -r requirements.txt
    fi

    # Set environment variables
    export DATABASE_URL="postgresql://fourmore:fourmore_dev_password@localhost:5432/fourmore"
    export REDIS_URL="redis://localhost:6379"
    export JWT_SECRET="local_dev_jwt_secret"
    export ENVIRONMENT="development"

    # Start backend in background
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    cd ..
else
    echo "Backend directory not found, skipping backend startup"
fi

# Check if frontend directory exists
if [ -d "frontend" ]; then
    echo "Starting frontend..."
    cd frontend
    if [ -f "package.json" ]; then
        # Install dependencies if node_modules doesn't exist
        if [ ! -d "node_modules" ]; then
            npm install
        fi
        # Start frontend in background
        npm run dev &
        FRONTEND_PID=$!
    fi
    cd ..
else
    echo "Frontend directory not found, skipping frontend startup"
fi

echo ""
echo "✅ Services starting up..."
echo ""
echo "📱 URLs:"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173 (or check npm output)"
echo "  Database: localhost:5432"
echo ""
echo "🌐 To expose via ngrok:"
echo "  Backend:  ngrok http 8000"
echo "  Frontend: ngrok http 5173"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'echo "Stopping services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker compose down; exit' INT
wait