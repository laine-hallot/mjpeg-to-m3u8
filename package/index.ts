import type { InferValue } from '@optique/core/parser';
import type { Program } from '@optique/core/program';

import { merge, object } from '@optique/core/constructs';
import { option } from '@optique/core/primitives';
import { string } from '@optique/core/valueparser';
import { run, path } from '@optique/run';
import { multiple, optional } from '@optique/core/modifiers';
import { message } from '@optique/core/message';
import express from 'express';
import { spawn } from 'child_process';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import nodePath from 'node:path';

const PORT = process.env.PORT || 8067;
const STREAM_DIR = process.env.STREAM_DIR || '/tmp/stream';

const globalOptions = object('Global Options', {
  config: optional(option('-c', '--config', path({ mustExist: true }))),
});

// Create a parser for --name option
const urlParser = object({
  streamUrl: multiple(option('--stream-url', string()), { min: 1 }),
  outDir: optional(option('--out-dir', path())),
});

const cli = merge(globalOptions, urlParser);

type Config = InferValue<typeof cli>;

const prog: Program<'sync', Config> = {
  parser: cli,
  metadata: {
    name: 'mjpeg-to-m3u8',
    version: '1.0.0',
    brief: message`Restream a MJPEG stream as m3u8`,
  },
};

// Run the parser with some example arguments
const result = run(urlParser, {
  help: 'both', // Both --help and help command
  version: prog.metadata.version!, // Enable version display
  aboveError: 'usage', // Show usage on errors
  colors: true, // Colored output
});

const restream = (streamUrl: string, outPath: string) => {
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

const basePath = result.outDir ?? STREAM_DIR;

const streams = result.streamUrl.map((streamUrl, index) =>
  restream(streamUrl, `${basePath}/stream-${index}`),
);

const app = express();
app.use(express.static(nodePath.resolve(basePath)));

const server = app.listen(PORT, () => {
  console.log(`Serving ${basePath} on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Finished all requests');
  });
  streams.map((stream) => {
    stream.kill();
  });
  process.exit();
});
