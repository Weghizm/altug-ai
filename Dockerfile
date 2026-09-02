FROM python:3.11-slim

# Install system dependencies (fonts for unicode PDF generation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-dejavu-core \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements & install Python dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy source code & prebuilt frontend
COPY backend/ /app/backend/
COPY frontend/dist/ /app/frontend/dist/
COPY data/ /app/data/

ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["sh", "-c", "python -m uvicorn app:app --app-dir /app/backend --host 0.0.0.0 --port ${PORT:-8000}"]
