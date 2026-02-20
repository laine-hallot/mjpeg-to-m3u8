import { object } from '@optique/core/constructs';
import { option } from '@optique/core/primitives';
import { string } from '@optique/core/valueparser';
import { path } from '@optique/run';
import { multiple, withDefault } from '@optique/core/modifiers';
import { message } from '@optique/core/message';
import { z } from 'zod';
import express from 'express';
import nodePath from 'node:path';
import { bindConfig, createConfigContext } from '@optique/config';
import { runWithConfig } from '@optique/config/run';
import { restream } from './src/stream.js';
import process from 'node:process';

import packageJson from './package.json' with { type: 'json' };

const configSchema = z.object({
  streamUrl: z.optional(
    z.array(
      z.union([
        z.string(),
        z.object({
          name: z.optional(z.string()),
          url: z.string(),
        }),
      ]),
    ),
  ),
  outDir: z.optional(z.string()),
});

type Config = z.infer<typeof configSchema>;

const configContext = createConfigContext({ schema: configSchema });

const cli = object({
  config: withDefault(
    option('-c', '--config', path({ mustExist: true, type: 'file' })),
    nodePath.resolve(process.cwd(), './mjpeg-to-m3u8.config.json'),
  ),
  port: withDefault(
    option('-p', '--port', path({ mustExist: true, type: 'file' })),
    process.env.PORT || 8067,
  ),
  streamUrl: bindConfig(option('--stream-url', string()), {
    context: configContext,
    key: 'streamUrl',
    default: process.env.STREAM_URL || '',
  }),
  outDir: bindConfig(option('--out-dir', path({ type: 'directory' })), {
    context: configContext,
    key: 'outDir',
    default: process.env.OUT_DIR || '/tmp/stream',
  }),
});

const startStreams = (
  streamUrl: Config['streamUrl'] | string,
  outDir: string,
) => {
  if (Array.isArray(streamUrl)) {
    // unfortunately the type for result is `CliOptions` instead of `CliOptions & Config` so cast it
    return streamUrl.map((streamUrl, index) => {
      if (typeof streamUrl === 'string') {
        return restream(streamUrl, `${outDir}/stream-${index}`);
      } else {
        const name = streamUrl.name;
        return restream(
          streamUrl.url,
          name === undefined
            ? `${outDir}/stream-${index}`
            : `${outDir}/${name}`,
        );
      }
    });
  } else {
    return [restream(streamUrl!, outDir)];
  }
};

try {
  const { streamUrl, config, outDir, port } = await runWithConfig(
    cli,
    configContext,
    {
      getConfigPath: (parsed) => {
        if (process.env.DEBUG) {
          console.log(parsed);
        }
        return parsed.config;
      },
      help: { mode: 'option' },
      version: {
        value: packageJson.version,
        mode: 'option',
      },
      completion: {
        mode: 'option',
      },
      aboveError: 'usage', // Show usage on errors
      showDefault: true,
      programName: 'mjpeg-to-m3u8',
      brief: message`Restream a MJPEG stream as m3u8`,
      colors: true, // Colored output
      args: process.argv.slice(2),
    },
  );
  if (process.env.DEBUG) {
    console.log({ streamUrl, config, outDir, port });
  }

  const streams = startStreams(
    streamUrl as string & Config['streamUrl'],
    outDir,
  );

  const app = express();
  app.use(express.static(nodePath.resolve(outDir)));

  const server = app.listen(port, () => {
    console.log(`Serving ${outDir} on http://localhost:${port}`);
  });

  process.on('SIGTERM', () => {
    server.close(() => {
      console.log('Express server stopped');
    });
    streams.map((stream) => {
      stream.kill();
    });
    process.exit();
  });
} catch (err) {
  console.error('Could not parse config file', err);

  /* NO-OP since optique throws on error instead of returning some kind of result type*/
}
