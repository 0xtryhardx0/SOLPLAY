FROM python:3.11-alpine

WORKDIR /app

# Copy static frontend assets into container
COPY index.html style.css app.js solplay_db.js logo.png sovereign_signature.jpg ./

# Dynamic port binding
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c"]
CMD ["python3 -m http.server ${PORT:-8080}"]
