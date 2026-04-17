import torch
from transformers import pipeline
import uvicorn
import base64
from io import BytesIO
from PIL import Image
import os

app = FastAPI()

# Optimization for Raspberry Pi 5 / CPU Inference
torch.set_num_threads(4) # Pi 5 has 4 cores
if hasattr(torch.backends, 'quantized'):
    torch.backends.quantized.engine = 'qnnpack'

# Load the HuggingFace model using the pipeline
MODEL_ID = "ebmonser/lung-cancer-image-classification"
classifier = pipeline("image-classification", model=MODEL_ID)

@app.post("/predict")
async def predict_lung(request: Request):
    data = await request.json()
    
    # 1. Decode base64 image
    image_b64 = data.get("image", "")
    if image_b64.startswith("data:"):
        image_b64 = image_b64.split(",")[1]
        
    image_data = base64.b64decode(image_b64)
    image = Image.open(BytesIO(image_data)).convert("RGB")
    
    # 2. Run optimized inference
    with torch.inference_mode():
        results = classifier(image)
    
    # 3. Format response to match existing standard from Gemini
    best_pred = results[0]
    label = best_pred["label"]
    score = best_pred["score"]
    
    is_malignant = label.lower() in ["malignant", "cancer", "tumor"]

    return {
        "classification": "Malignant" if is_malignant else "Benign",
        "description": f"ผลการวิเคราะห์จาก Local AI Model ({MODEL_ID})\nระบบมีความมั่นใจ {score * 100:.1f}% ว่าเนื้อเยื่อเป็นแบบ {label}",
        "reasons": [
            f"การประมวลผลด้วยโมเดล: {MODEL_ID}",
            f"โอกาสเกิดเนื้อร้าย (Malignancy Risk): {score * 100:.2f}%" if is_malignant else f"โอกาสพบเนื้อร้ายต่ำ อย่างไรก็ตาม โมเดลมั่นใจ {score * 100:.2f}% ว่าเป็น {label}",
            "โมเดลประมวลผลบนเครื่อง (On-Premise) ปลอดภัยต่อข้อมูลความลับแพทย์"
        ],
        "malignancyRisk": score if is_malignant else 1 - score
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
