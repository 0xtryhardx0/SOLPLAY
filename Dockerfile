FROM python:3.11-alpine

WORKDIR /app

# Copy all static frontend & runtime assets into container
COPY index.html redesign.html multihopper.html admin.html style.css app.js multihopper_client.js mh_runtime_config.json verified_squads_database.js live_roster_service.js admin.js solplay_db.js active_matches.json manifest.json sw.js logo.png solplay_icon.svg solplay_icon.png solplay_logo.svg solplay_logo.png solplay_logo_cropped.png sovereign_signature.jpg ./

# Dynamic port binding
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c"]
CMD ["python3 -m http.server ${PORT:-8080}"]
