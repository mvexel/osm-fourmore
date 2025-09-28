"""FourMore FastAPI backend application."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
import sys
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout,
    force=True  # Force reconfiguration
)

# Also set uvicorn loggers to show our app logs
# logging.getLogger("uvicorn").setLevel(logging.INFO)
# logging.getLogger("uvicorn.access").setLevel(logging.INFO)

# Quiet down noisy HTTP libraries
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

# Import routers
from .routers import auth, places, checkins, osm_edits, categories
from .database import create_tables

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application lifespan events."""
    # Startup
    logger.info("Creating database tables...")
    create_tables()
    logger.info("Database tables created successfully")
    
    yield
    
    # Shutdown (if needed)
    logger.info("Application shutting down...")

app = FastAPI(
    title="FourMore API",
    description="Social check-in app using OpenStreetMap data",
    version="1.0.0",
    root_path="/api",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", # Local development
        "http://127.0.0.1:3000", # Local development (127.0.0.1)
        "https://fourmore.osm.lol", # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(places.router)
app.include_router(checkins.router)
app.include_router(osm_edits.router)
app.include_router(categories.router)

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": "FourMore API is running",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Detailed health check."""
    # Check database connection
    try:
        from .db import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "version": "1.0.0"
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle unexpected exceptions."""
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": str(exc) if os.getenv("DEBUG") else "An unexpected error occurred"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)