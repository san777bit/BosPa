FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY bospa ./bospa
COPY data ./data
RUN uv sync --frozen --no-dev

CMD ["uv", "run", "--no-dev", "python", "-m", "bospa"]
