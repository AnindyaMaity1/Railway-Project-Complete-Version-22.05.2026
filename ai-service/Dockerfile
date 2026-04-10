# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code into the container at /app
COPY . .

# Expose port (Render will assign PORT env variable)
EXPOSE 3000

# Define environment variable
ENV FLASK_APP=app.py

# Run with gunicorn, using PORT env variable (default 3000)
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-3000} app:app"]
