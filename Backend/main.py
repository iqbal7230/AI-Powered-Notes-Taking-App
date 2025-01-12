from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from apps.calculate.route import router as calculator_router
from constant import SERVER_URL, PORT, ENV


# Optionally remove this if not performing setup/cleanup tasks
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Add setup tasks here if needed
    yield
    # Add cleanup tasks here if needed


# Initialize FastAPI app
app = FastAPI(lifespan=lifespan)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow specific frontend origin
    allow_credentials=True,                   # Allow cookies and authentication
    allow_methods=["*"],                     
    allow_headers=["*"],                      
)

# Root endpoint
@app.get("/")
async def root():
    """Health check endpoint for server."""
    return {"message": "Server is running"}

# Include calculator router
app.include_router(calculator_router, prefix="/calculate", tags=["calculate"])

# Run the application
if __name__ == "__main__":
    try:
        uvicorn.run(
            "main:app",
            host=SERVER_URL or "127.0.0.1",  # Fallback to localhost if SERVER_URL is None
            port=int(PORT or 8000),          # Fallback to port 8000 if PORT is None
            reload=(ENV == "dev"),           # Enable reload only in development
        )
    except ValueError as e:
        print(f"Error starting the server: {e}")
