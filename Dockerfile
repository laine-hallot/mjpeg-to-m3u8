# Dockerfile
FROM linuxserver/ffmpeg:latest

RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
  && apt-get install -y nodejs
COPY package/ /app/

RUN mkdir -p /tmp/stream

WORKDIR /app/

ENTRYPOINT []
CMD ["/bin/sh", "-c", "node dist/index.js --out-dir /tmp/stream"]
