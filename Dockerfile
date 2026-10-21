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

# Copy application files (including compiled React bundle in static/dist)
COPY . .

# Expose port (Cloud Run sets $PORT dynamically, default 8000)
ENV PORT=8000
EXPOSE 8000

CMD ["python", "app.py"]
