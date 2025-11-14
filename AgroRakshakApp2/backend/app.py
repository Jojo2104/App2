from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
from ultralytics import YOLO
import logging
import warnings
import os
from fastapi.middleware.cors import CORSMiddleware

# Suppress warnings
warnings.filterwarnings('ignore')
os.environ['YOLO_VERBOSE'] = 'False'

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AgroRakshak API", version="1.0.0")

# CORS - Allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://agrorakshak.web.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# CORS - Allow frontend domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://agrorakshak.web.app",
        "https://agrorakshak.firebaseapp.com",
        "https://*.web.app",  # Allow all Firebase hosting domains
        "*"  # Temporarily allow all (remove after testing)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLOv8 model
model = None
try:
    import torch
    
    logger.info("Attempting to load YOLO model...")
    logger.info(f"PyTorch version: {torch.__version__}")
    
    model = YOLO("best.pt", task='detect')
    
    # Test the model with a dummy image
    dummy_img = np.zeros((640, 640, 3), dtype=np.uint8)
    test_result = model(dummy_img, conf=0.1)
    
    logger.info("✓ YOLOv8 model loaded successfully!")
    logger.info(f"✓ Model classes: {model.names}")
    
except Exception as e:
    logger.error(f"✗ FAILED to load model: {str(e)}")
    import traceback
    logger.error(traceback.format_exc())
    model = None

# Your exact class configuration from the loaded model
CLASS_NAMES = {
    0: "Early_blight",
    1: "Healthy",
    2: "Late_blight",
    3: "Leaf Miner",
    4: "Magnesium Deficiency",
    5: "Nitrogen Deficiency",
    6: "Pottassium Deficiency",  # Note: your model has typo "Pottassium"
    7: "Spotted Wilt Virus"
}


# Your validated class-specific thresholds
CONFIDENCE_THRESHOLDS = {
    0: 1.0,  # Early_blight - LOWERED FOR TESTING
    1: 1.0,  # Healthy - LOWERED FOR TESTING
    2: 0.18,  # Late_blight - LOWERED FOR TESTING
    3: 0.55,  # Leaf_Miner - LOWERED FOR TESTING
    4: 0.50,  # Magnesium_Deficiency - LOWERED FOR TESTING
    5: 1.0,  # Nitrogen_Deficiency - LOWERED FOR TESTING
    6: 1.0,  # Pottassium_Deficiency - LOWERED FOR TESTING
    7: 1.0   # Spotted_Wilt_Virus - LOWERED FOR TESTING
}


# Treatment recommendations
RECOMMENDATIONS = {
    "Early_blight": "Apply copper-based fungicide. Remove affected leaves and improve air circulation.",
    "Healthy": "Plants are healthy! Continue regular monitoring and maintenance.",
    "Late_blight": "CRITICAL: Apply fungicide immediately (chlorothalonil or mancozeb). Remove infected parts.",
    "Leaf Miner": "Apply neem oil or appropriate insecticide. Remove heavily infested leaves.",
    "Magnesium Deficiency": "Apply Epsom salt solution (1 tbsp per gallon). Spray on leaves.",
    "Nitrogen Deficiency": "Apply nitrogen-rich fertilizer (urea or ammonium nitrate). Use foliar spray.",
    "Pottassium Deficiency": "Apply potassium sulfate (1-2 tbsp per plant). Use wood ash or compost.",
    "Spotted Wilt Virus": "HIGH ALERT: Remove infected plants immediately. Control thrips vectors."
}

SEVERITY_LEVELS = {
    "Late_blight": "high",
    "Spotted Wilt Virus": "high",
    "Early_blight": "high",
    "Leaf Miner": "medium",
    "Magnesium Deficiency": "medium",
    "Nitrogen Deficiency": "medium",
    "Pottassium Deficiency": "medium",
    "Healthy": "low"
}

@app.get("/")
async def root():
    return {
        "app": "AgroRakshak API",
        "version": "1.0.0",
        "status": "running",
        "model_loaded": model is not None
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy" if model else "model_not_loaded",
        "model": "loaded" if model else "not_loaded",
        "classes": len(CLASS_NAMES)
    }

@app.post("/api/detect")
async def detect_disease(file: UploadFile = File(...)):
    """
    Detect plant diseases using YOLOv8 model.
    Returns highest confidence detection above class-specific threshold.
    """
    if not model:
        raise HTTPException(
            status_code=503, 
            detail="Model not loaded. Check backend logs for details."
        )
    
    try:
        # Read and decode image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Get image dimensions
        img_height, img_width = img.shape[:2]
        logger.info(f"Processing image: {img_width}x{img_height}")
        
        # Run YOLO detection with low confidence to get all predictions
        results = model(img, conf=0.1)
        
        valid_detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                class_name = CLASS_NAMES.get(class_id, "Unknown")
                
                # Apply class-specific threshold
                threshold = CONFIDENCE_THRESHOLDS.get(class_id, 0.25)
                logger.info(f"Detection: {class_name} - confidence={confidence:.4f}, threshold={threshold}")
                
                if confidence >= threshold:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    valid_detections.append({
                        "class": class_name,
                        "class_id": class_id,
                        "confidence": round(confidence, 4),
                        "threshold": threshold,
                        "bbox": {
                            "x1": round(x1, 2),
                            "y1": round(y1, 2),
                            "x2": round(x2, 2),
                            "y2": round(y2, 2),
                            "width": round(x2 - x1, 2),
                            "height": round(y2 - y1, 2)
                        },
                        "recommendation": RECOMMENDATIONS.get(class_name, "Consult expert"),
                        "severity": SEVERITY_LEVELS.get(class_name, "medium")
                    })
        
        # Return highest confidence detection
        if valid_detections:
            best_detection = max(valid_detections, key=lambda x: x["confidence"])
            logger.info(f"Selected: {best_detection['class']} at {best_detection['confidence']}")
            return {
                "success": True,
                "detection": best_detection,
                "total_detections": len(valid_detections),
                "image_size": {"width": img_width, "height": img_height}
            }
        else:
            logger.info("No detections above thresholds")
            return {
                "success": True,
                "detection": None,
                "message": "No diseases detected above confidence thresholds",
                "image_size": {"width": img_width, "height": img_height}
            }
            
    except Exception as e:
        logger.error(f"Detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
