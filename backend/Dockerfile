FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn eventlet

COPY . .

EXPOSE 5000

CMD ["sh", "-c", "python seed.py && gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5000 run:app"]
