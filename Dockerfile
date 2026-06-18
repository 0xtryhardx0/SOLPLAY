FROM python:3.9-slim
WORKDIR /app
COPY . /app
EXPOSE 8080
CMD ["python", "server.py"]
