# Use an official Python runtime as a parent image
FROM python:3.13-slim

# Set the working directory
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .

# We will define the startup command in docker-compose
CMD uvicorn sales_data_agent.remote_sales_data_agent.agent:a2a_app --host 0.0.0.0 --port $PORT
