ffmpeg -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5 \
  -i "${STREAM_URL}" \
  -c:v libx264 \
  -preset ultrafast \
  -tune zerolatency \
  -f hls -hls_time 2 -hls_list_size 5 -hls_flags delete_segments \
  /tmp/stream/index.m3u8
