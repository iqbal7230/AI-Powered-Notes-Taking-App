from fastapi import APIRouter, HTTPException
import base64
from io import BytesIO
from typing import Dict, Any, List
from pydantic import BaseModel
from PIL import Image
from apps.calculate.utils import analyze_image  # Import your actual analyze_image function

# Schema definition
class ImageData(BaseModel):
    image: str
    dict_of_vars: Dict[str, Any]

# Create router instance
router = APIRouter()

@router.post('')
async def run(data: ImageData):
    try:
        # Validate and decode base64 image
        try:
            # Split the base64 string if it contains the data URI scheme
            if ',' in data.image:
                image_data = base64.b64decode(data.image.split(",")[1])
            else:
                image_data = base64.b64decode(data.image)
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid image data")

        # Convert to PIL Image
        image_bytes = BytesIO(image_data)
        try:
            image = Image.open(image_bytes)
        except Exception as e:
            raise HTTPException(status_code=400, detail="Could not process image")

        # Process image using your existing analyze_image function
        responses = analyze_image(image, dict_of_vars=data.dict_of_vars)
        
        # Handle empty responses
        if not responses:
            return {
                "message": "Image processed but no results found",
                "data": [],
                "status": "success"
            }

        # Return processed data
        return {
            "message": "Image processed successfully",
            "data": responses,
            "status": "success"
        }

    except Exception as e:
        # Log the error (you should implement proper logging)
        print(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing image")