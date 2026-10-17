FROM python:3.11-alpine

WORKDIR /app

# Copy static frontend assets into container
COPY index.html style.css app.js solplay_db.js logo.png sovereign_signature.jpg ./

# Cloud platforms (Railway, Render, Cloud Run) inject $PORT dynamically
ENV PORT=8080
EXPOSE 8080

# Serve static web app with universal port binding
CMD ["sh", "-c", "python3 -m http.server ${PORT:-8080}"]
