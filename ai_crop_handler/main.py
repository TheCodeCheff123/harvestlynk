import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger
from pydantic import BaseModel, Field
from enum import StrEnum
import numpy as np
import tensorflow as tf
from PIL import Image
import io
from starlette.concurrency import run_in_threadpool
from data import CLASS_NAMES, TREATMENTS

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up and loading model...")
    try:
        app.state.model = tf.keras.models.load_model('models/best_crop_disease_model.h5', compile=False)
        logger.success("Model loaded into app.state successfully!")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
    yield
    logger.info("Shutting down...")

app = FastAPI(title="Plant Pathology API", lifespan=lifespan)

origins = ["http://localhost:3000", "https://app-harvestlynk.vercel.app"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Status(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class TreatmentInfo(BaseModel):
    symptoms: str
    cause: str
    treatment: str
    prevention: str

class PathogenResponse(BaseModel):
    filename: str
    prediction: str
    treatment: TreatmentInfo
    confidence: float = Field(..., ge=0.0, le=1.0)
    status: Status

def transform_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img = img.resize((224, 224))
    img_array = np.array(img) / 255.0
    return np.expand_dims(img_array, axis=0)

@app.post('/predict', response_model=PathogenResponse)
async def predict_pathogen(file: UploadFile = File(...)):
    try:
        logger.info(f"Attempting prediction for: {file.filename}")
        
        # 1. Check if the model actually exists in state
        if not hasattr(app.state, 'model'):
             raise HTTPException(status_code=500, detail="Model not loaded in app state")

        contents = await file.read()
        input_tensor = transform_image(contents)
        
        # 2. Use app.state.model here!
        predictions = await run_in_threadpool(app.state.model.predict, input_tensor)
        
        idx = np.argmax(predictions[0])
        full_label = CLASS_NAMES[idx] 
        
        # 3. Treatment Logic
        disease_key = full_label.replace("___", "_")
        treatment_info = TREATMENTS.get(disease_key, TREATMENTS.get("healthy"))
        
        if "healthy" in full_label.lower():
            treatment_info = TREATMENTS["healthy"]

        logger.success(f"Prediction successful: {full_label}")
        
        return {
            'filename': file.filename,
            "prediction": full_label.replace("___", " ").replace("_", " "),
            "treatment": treatment_info,
            "confidence": round(float(np.max(predictions[0])), 4),
            "status": Status.COMPLETED,
        }
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/')
async def root():
    """healthcheck endpoint"""
    logger.info("Root health check healthy...")
    return {
        'message': f'API status: succesful',
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)