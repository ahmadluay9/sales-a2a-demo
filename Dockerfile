FROM python:3.13-slim

WORKDIR /app

# Install system dependencies if needed (e.g., for psycopg2)
RUN apt-get update && apt-get install -y libpq-dev gcc

# Copy requirements and install
# Ensure you have a requirements.txt with: fastapi, uvicorn, google-adk, psycopg2-binary, python-dotenv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .

# Expose the ports
EXPOSE 8004
EXPOSE 8000
# Adk runs from port 8000

# We will define the startup command in docker-compose
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"]