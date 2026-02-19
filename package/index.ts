import type { InferValue } from "@optique/core/parser";

import { merge, object, or } from "@optique/core/constructs";
import { option } from "@optique/core/primitives";
import { string } from "@optique/core/valueparser";
import { run, print, path } from "@optique/run";
import { multiple, optional } from "@optique/core/modifiers";
import { message } from "@optique/core/message";
import express from "express";

const globalOptions = object("Global Options", {
  config: optional(option("-c", "--config", path({ mustExist: true }))),
});

// Create a parser for --name option
const urlParser = multiple(option("--stream-url", string()), { min: 1 });

const cli = merge(globalOptions, urlParser);

type Config = InferValue<typeof cli>;

const prog: Program<"sync", Config> = {
  parser: cli,
  metadata: {
    name: "mjpeg-to-m3u8",
    version: "1.0.0",
    brief: message`Restream a MJPEG stream as m3u8`,
  },
};

// Run the parser with some example arguments
const result = run(urlParser, {
  help: "both", // Both --help and help command
  version: prog.metadata.version, // Enable version display
  aboveError: "usage", // Show usage on errors
  colors: true, // Colored output
});

print(message`Hello, ${result}!`);

const app = express();
const PORT = process.env.PORT || 8067;
const STREAM_DIR = process.env.STREAM_DIR || "/tmp/stream";

app.use(express.static(STREAM_DIR));

app.listen(PORT, () => {
  console.log(`Serving ${STREAM_DIR} on http://localhost:${PORT}`);
});
