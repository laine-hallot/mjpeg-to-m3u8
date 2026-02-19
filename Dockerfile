# Dockerfile
FROM node:24-alpine AS build

COPY package/ /app/

WORKDIR /app/

RUN npm ci
RUN npm run build


FROM linuxserver/ffmpeg:latest
LABEL org.opencontainers.image.source=https://github.com/laine-hallot/mjpeg-to-m3u8

RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
&& apt-get install -y nodejs

WORKDIR /app/

# Copy the binary from builder stage
COPY --from=build /app/dist/ ./dist/
COPY --from=build /app/node_modules/ ./node_modules/

RUN mkdir -p /tmp/stream

EXPOSE 8067

ENTRYPOINT []
CMD ["/bin/sh", "-c", "node dist/index.js --out-dir /tmp/stream"]
