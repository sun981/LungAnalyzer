# Use an official lightweight Python image
# This slim image works great on ARM64 (Raspberry Pi 5)
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV TRANSFORMERS_CACHE=/app/model_cache

# Set working directory
WORKDIR /app

# Install system dependencies needed for image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the model into the image
# This ensures the container starts instantly on the Pi
RUN python -c "from transformers import pipeline; pipeline('image-classification', model='ebmonser/lung-cancer-image-classification')"

# Copy the rest of the application
COPY . .

# Expose port 8000
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main.py:app", "--host", "0.0.0.0", "--port", "8000"]
