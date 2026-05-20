# Multi-stage production image for SaaSStack backend
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libpq-dev \
  && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /build/requirements.txt
RUN pip install --upgrade pip && pip wheel --no-cache-dir -r requirements.txt -w /wheels

FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --create-home --uid 1000 app

WORKDIR /app

COPY --from=builder /wheels /wheels
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache /wheels/* && rm -rf /wheels

ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}

COPY backend/ /app/
COPY backend/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh && chown -R app:app /app

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/api/health/ || exit 1

CMD ["/app/entrypoint.sh"]
