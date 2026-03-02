# ---- Stage 1: Build React frontend ----
FROM node:20-slim AS frontend-builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Optional: bake Gemini API key at build time
# Set GEMINI_API_KEY as a Railway variable and it will be passed through
ARG GEMINI_API_KEY=""
ENV GEMINI_API_KEY=${GEMINI_API_KEY}

COPY . .
RUN npm run build

# ---- Stage 2: Python FastAPI backend + built frontend ----
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 8080

# PORT is injected by Railway at runtime
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080}
