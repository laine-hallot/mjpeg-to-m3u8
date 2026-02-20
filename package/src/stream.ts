import { spawn } from 'child_process';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

export const restream = (streamUrl: string, outPath: string) => {
  try {
    if (!existsSync(outPath)) {
      fs.mkdir(outPath, { recursive: true });
    }
  } catch (err) {
    console.error(err);
  }

  return spawn(
    'ffmpeg',
    [
      ['-reconnect', '1'],
      ['-reconnect_streamed', '1'],
      ['-reconnect_delay_max', '5'],
      ['-i', `${streamUrl}`],
      ['-c:v', 'libx264'],
      ['-preset', 'ultrafast'],
      ['-tune', 'zerolatency'],
      ['-f', 'hls'],
      ['-hls_time', '2'],
      ['-hls_list_size', '5'],
      ['-hls_flags', 'delete_segments'],
      `${outPath}/index.m3u8`,
    ].flat(),
    { stdio: 'inherit' },
  );
};
