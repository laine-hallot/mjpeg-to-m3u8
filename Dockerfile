# Dockerfile
FROM linuxserver/ffmpeg:latest

RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*

COPY ffmpeg-stream.sh /ffmpeg-stream.sh

RUN mkdir -p /tmp/stream

CMD ["/bin/sh", "-c", "python3 -m http.server 8067 --directory /tmp/stream & /ffmpeg-stream.sh"]
