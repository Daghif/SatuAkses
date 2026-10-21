# Stage 1: Build React + Vite + Motion.dev + Anime.js Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python FastAPI + LangGraph + Playwright Runtime
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies & fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    curl \
    gnupg \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install --with-deps chromium

# Copy application files & compiled React bundle
COPY . .
COPY --from=frontend-builder /build/static/dist ./static/dist

# Expose port (Cloud Run sets $PORT dynamically, default 8000)
ENV PORT=8000
EXPOSE 8000

CMD ["python", "app.py"]
