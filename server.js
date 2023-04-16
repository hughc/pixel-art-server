import _ from 'underscore';
import { saveAllPlaylists } from './endpoints/save_all_playlists.js';
import { saveClient } from './endpoints/save_client.js';
import { replaceImageSet } from './endpoints/save_image_set.js';
import { uploadFiles } from './endpoints/upload_files.js';
import { getClients } from './endpoints/get_clients.js';
import { getImage } from './endpoints/get_image.js';
import { deletePlaylist } from './endpoints/delete_playlist.js';

import { getAllImageStats } from './utils/get_image_stat.js';
import { Data } from './utils/data.js';

import express from 'express';

const { json, urlencoded } = express;
import fileUpload from 'express-fileupload';
import cors from 'cors';
//const cors = require("cors");

import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';

const optionDefinitions = [
  {
    name: "port",
    type: Number,
    multiple: false,
    typeLabel: "<port number>",
    description: "server port - defaults to 80",
  },
  {
    name: "env",
    alias: "e",
    type: String,
    description: "environment - dev starts server on dev port (3001)",
  },
  { name: "help", type: Boolean },
];

const sections = [
  {
    header: "Pixel art server",
    content: "serves rgb values to multiple LED matrices.",
  },
  {
    header: "Options",
    optionList: optionDefinitions,
  },
];

const usage = commandLineUsage(sections);
const options = commandLineArgs(optionDefinitions);

//if (options.help) return console.log(usage);
const port = options["port"] ? options.port : options.env == "dev" ? 3001 : 80;

// init the data sources (clients, playlists)
new Data(import.meta.url);

console.log({plpath: Data.playlistFilePath, clientsFilePath: Data.clientsFilePath})

var app = express();
app.use(cors());
app.use("/", express.static("public"));
//var bodyParser = require("body-parser");

app.use(Data.staticImageBaseURL, express.static(Data.imageDirectoryPath));
// default options
app.use(fileUpload());
// Parse URL-encoded bodies (as sent by HTML forms)
app.use(urlencoded({ extended: true }));
app.use(json({ type: "application/json)" }));
//app.use(bodyParser.json());
// Parse JSON bodies (as sent by API clients)
app.use(json());


// prime image cache - this returns a Promise
getAllImageStats();

app.post("/upload", uploadFiles);

app.get("/clients", getClients)

app.get("/imagesets", (req, res) => {
  res.send(Data.playlists);
});

// sent by client on boot
app.get("/checkin", (req, res) => {
  const {width, height, pixelCount: pixels, id} = req.query;
  const params = { id, pixels, width, height};
  // only save if new
  saveClient(params, false);
  res.send("ok");
});

app.post("/clients", function (req, res) {
  var clientData = _.pick(
    req.body,
    "id",
    "name",
    "pixelsCount",
    "width",
    "height",
    "imagesetId"
  );
  if (!clientData.id) {
    res.send({ success: false, error: "no client id supplied" });
    return;
  }
  saveClient(clientData, true);
  res.send({ success: true });
});

app.post("/imageset", replaceImageSet);

app.post("/imagesets", function (req, res) {
  saveAllPlaylists(req.body);
  res.send({ success: true });
});

app.delete("/imageset", deletePlaylist);

app.get("/image", getImage);

app.get("/images", (req, res) => {
    res.send(getAllImageStats());
});

app.listen(port, () =>
  console.log(`server app listening at http://localhost:${port}`)
);



