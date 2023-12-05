import express from "express";
import ffmpeg from "fluent-ffmpeg";
import { parseArgs } from "node:util";

const options = {
  port: {
    type: "string",
    short: "p",
    default: "3000",
  },
  srtrelayEnpoint: {
    type: "string",
    short: "s",
  },
};
const { values: args } = parseArgs({ options });

const app = express();

app.head("/:streamId", function (req, res) {
  const streamId = req.params.streamId;
  fetch(args.srtrelayEnpoint)
    .then((r) => r.json())
    .then((streams) => {
      const stream = streams.find((s) => s.name === streamId);
      if (stream) {
        res.status(200).end();
      } else {
        res.status(404).end();
      }
    })
    .catch(() => {
      res.status(404).end();
    });
});

app.get("/:streamId", function (req, res) {
  const streamId = req.params.streamId;

  fetch(args.srtrelayEnpoint)
    .then((r) => r.json())
    .then((streams) => {
      const stream = streams.find((s) => s.name === streamId);
      if (!stream) {
        res.status(404).send("Unable to find matching stream!");
        return;
      }
      const srtUrl = stream.url;

      ffmpeg(srtUrl)
        .inputOptions(["-vn", "-fflags nobuffer"])
        .audioFrequency(16000)
        .audioChannels(1)
        .audioCodec("pcm_f32le")
        .format("f32le")
        .on("start", function (commandLine) {
          console.log("Spawned ffmpeg with command: " + commandLine);
        })
        .on("progress", function (progress) {
          console.debug(progress);
        })
        .on("end", function () {
          console.log("Finished processing");
        })
        .on("error", function (err) {
          console.error("Ffmpeg error:" + err.message);
        })
        .pipe(res, { end: true });
    })
    .catch((e) => {
      console.log(e);
      res.status(404).send("Error");
    });
});

app.listen(args.port);
