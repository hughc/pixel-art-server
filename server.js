const sharp = require("sharp");
const _ = require("underscore");
const fs = require("fs-extra");
const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const path = require('path');

const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");

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

if (options.help) return console.log(usage);
const port = options["port"] ? options.port : options.env == "dev" ? 3001 : 80;

let imageStatsCache = [];
let imageDirectoryCache = [];

const metadataKeys = ["width", "height", "format", "hasAlpha", "pages", "delay"];

// clear caches- next fetch will regenerate
var pixelMap = [];
const staticImageBaseURL = "/image-preview";
const imageDirectoryPath = path.resolve(__dirname, 'img');

const playlistFilePath = path.resolve(__dirname, 'data/playlists.json');
const clientsFilePath = path.resolve(__dirname,"data/clients.json");

console.log({playlistFilePath, clientsFilePath})

let gPlaylists = [];
if (fs.existsSync(playlistFilePath)) {
  gPlaylists = fs.readJSONSync(playlistFilePath);
}

let gClients = [];
if (fs.existsSync(clientsFilePath)) {
  gClients = fs.readJSONSync(clientsFilePath);
} 

var app = express();
app.use(cors());
app.use(express.static("build"));
//var bodyParser = require("body-parser");

app.use(staticImageBaseURL, express.static(imageDirectoryPath));
// default options
app.use(fileUpload());
// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ type: "application/json)" }));
//app.use(bodyParser.json());
// Parse JSON bodies (as sent by API clients)
app.use(express.json());


// prime image cache

returnAllImageStats();

app.post("/upload", function (req, res) {
  //console.log(req.files);

  if (!req.files || Object.keys(req.files).length === 0) {
    return res
      .status(200)
      .send({ success: false, error: "No files were uploaded." });
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let uploadedFile = req.files.file;
  let newName = uploadedFile.name;
  let subdir = req.body.subdir;
  console.log(subdir);
  fs.ensureDirSync(path.resolve(__dirname, `${imageDirectoryPath}/${subdir ? subdir + "/" : ""}`));
  // Use the mv() method to place the file somewhere on your server
  const shortPath = `${subdir ? subdir + "/" : ""}${newName}`;
  const newPath = path.resolve(__dirname, `${imageDirectoryPath}/${shortPath}`);
  uploadedFile.mv(newPath, function (err) {
    if (err) return res.status(500).send(err);
    returnAnImageStat({ path: shortPath }).then((result) => {
      imageStatsCache.push(result);
      imageDirectoryCache.push(shortPath);
      res.send({
        success: true,
        message: "File uploaded!",
        uid: newName,
        stats: result,
      });
    });
    // clear caches- next fetch will regenerate
    /*  imageStatsCache = [];
    imageDirectoryCache = []; */
  });
});

function gatherAllImages(basePath) {
  if (!_.isEmpty(imageDirectoryCache)) {
    console.log("returning cached file values");
    return imageDirectoryCache;
  }
  recursiveList = (dir, list) => {
    const inThisDir = fs.readdirSync(dir);
    _.each(inThisDir, (fileOrFolder) => {
      const conCatPath = `${dir}/${fileOrFolder}`;
      const stat = fs.statSync(conCatPath);
      if (stat.isDirectory()) {
        list = recursiveList(conCatPath, list);
      } else if (fileOrFolder.match(/\.gif|\.jpg|\.png/g)) {
        // console.log({ stat });
        const path = conCatPath.substr(basePath.length + 1);
        const created = stat.birthtimeMs;
        list.push({ path, created });
      }
    });
    return list;
  };
  imageDirectoryCache = recursiveList(basePath, []);
  return imageDirectoryCache;
}

app.get("/clients", (req, res) => {
  res.send(gClients);
});

app.get("/imagesets", (req, res) => {
  res.send(gPlaylists);
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

app.post("/imageset", function (req, res) {
  console.log('app.post("/imageset"', req.body);
  var imagesetData = _.pick(
    req.body,
    "id",
    "name",
    "duration",
    "brightness",
    "images"
  );
  if (!imagesetData.id) {
    res.send({ success: false, error: "no client id supplied" });
    return;
  }
  saveImageset(imagesetData, true);
  res.send({ success: true });
});

app.post("/imagesets", function (req, res) {
  saveAllImageset(req.body);
  res.send({ success: true });
});

app.delete("/imageset", function (req, res) {
  console.log("Got a DELETE request at /imageset");
  const uid = req.body.uid;
  gPlaylists = _.reject(gPlaylists, (imageset) => imageset.id == uid);
  saveAllImageset(gPlaylists);
  res.send({ success: true, message: "imageset removed" });
});

app.get("/image", (req, res) => {
  const { id, width = 8, height= 8 } = req.query;
  
  let setup = _.findWhere(gClients, { id });
  if (!setup) {
    console.warn(`client '${id}' not found`);
    // res.send(JSON.stringify({warning: id ? 'client not found' : 'need client param'}));
    // return;
    setup = {};
  }

  setup.width = parseInt(width);
  setup.height = parseInt(height);
  if (!setup.imagesetId) {
    
  }
  let imageset = _.findWhere(gPlaylists, { id: parseInt(setup.imagesetId) });
  if (!imageset) {
    console.warn(`imageset not found for id '${setup.imagesetId}'`);
    imageset = gPlaylists[0] | {};
  }
  let { images, index, duration, brightness, backgroundColor } = imageset;
  var imageCount = images?.length;
  if (_.isUndefined(index)) index = 0;
  if (index >= imageCount) index = 0;
  var path = images?.[index] || imageStatsCache?.[_.random(imageStatsCache.length-1)].id;
  if (!path) {
    res.send(JSON.stringify({warning: 'no playlist and no backup image'}));
    return;
  }

  imageset.index = index + 1;
  console.log({ path });

  backgroundColor = backgroundColor || "#000000";
  const pixelBufferOp = getImgPixelsBuffer(path, setup, backgroundColor);
  const metadata = _.findWhere(imageStatsCache, { id: path });
  let pages, info;
  console.log({ delay: metadata.delay });
  return pixelBufferOp.then((result) => {
    if (metadata?.pages > 1) {
      pages = _.pluck(result, "data");
      info = _.pluck(result, "info");
    } else {
      pages = [result.data];
      info = [{}];
    }
    console.log({pages: pages.length});
    const frames =
      _.map(pages, (data, frame) => {
        // default to 15 FPS
        const duration = metadata?.delay?.[frame] || Math.round(1000/15);
        console.log({duration});
        //data.reverse();
        var rgb = _.compact(
          _.map(data, (dp, index) => {
            if (index % 3) return;
            let r =parseInt(dp).toString(16)
            r = r.length == 2 ? r : '0' + r; 
            let g= parseInt(data[index+1]).toString(16);
            g = g.length == 2 ? g : '0' + g; 
            let b = parseInt(data[index+2]).toString(16);
            b = b.length == 2 ? b : '0' + b; 
            return  r + g + b;
          })
        );
       // console.log(rgb);
        const pixels = [];
        let linearCount = 0;
        for (let row = 0; row < setup.height; row++) {
          const rowPx = [];
          pixels.push(rowPx);
          for (let col = 0; col < setup.width; col++) {
            rowPx.push(rgb[linearCount]);
            linearCount++;
          }
        }
        return {pixels, duration, frame};
      });
      console.log(`>> server returns ${path} with ${frames.length} frames`)
    // add extra metadata
    duration = duration || 10;
    brightness = brightness || 25;
    const output = {path, duration, brightness, frames}
    res.removeHeader('transfer-encoding');
    res.contentType("application/json");
    res.send(JSON.stringify(output));
  });
});

app.get("/images", (req, res) => {
  if (!_.isEmpty(imageStatsCache)) {
    console.log("returning cached image stats");
    res.send(imageStatsCache);
    return;
  }

  returnAllImageStats().then((output) => res.send(output));
});

app.listen(port, () =>
  console.log(`server app listening at http://localhost:${port}`)
);

function saveClient(clientData, overWriteFlag) {
  existingClient = _.findWhere(gClients, { id: clientData.id });
  let updateToDisk = false;
  if (existingClient && overWriteFlag) {
    const pos = gClients.indexOf(existingClient);
    gClients.splice(pos, 1, clientData);
    console.log({ clientsList: gClients });
    updateToDisk = true;
  } else if (!existingClient) {
    gClients.push(clientData);
    updateToDisk = true;
  }
  if(updateToDisk) fs.writeJSONSync(clientsFilePath, gClients, {spaces: 2});
}

function saveImageset(imagesetData, overWriteFlag) {
  existingImageset = _.findWhere(gPlaylists, { id: imagesetData.id });
  let updateToDisk = false;
  if (existingImageset && overWriteFlag) {
    const pos = gPlaylists.indexOf(existingImageset);
    gPlaylists.splice(pos, 1, imagesetData);
    console.log({ imagesetsList: gPlaylists });
    updateToDisk = true;
  } else if (!existingImageset) {
    gPlaylists.push(imagesetData);
    updateToDisk = true;
  }
  if (updateToDisk) fs.writeJSONSync(playlistFilePath, gPlaylists, {spaces: 2});
}

function saveAllImageset(imagesetData) {
  console.log("saveAllImageset", imagesetData.length);
  fs.writeJSONSync(playlistFilePath, imagesetData, {spaces: 2});
  gPlaylists = imagesetData;
}


function returnAllImageStats() {
  var images = gatherAllImages(imageDirectoryPath);
  var output = [];
  return Promise.all(
    images.map((imgObj) => {
      let { path, created } = imgObj;
      return sharp(`${imageDirectoryPath}/${path}`)
        .metadata()
        .catch((err) => console.warn(`${path}: ${err}`))
        .then(function (metadata) {
          path = `${staticImageBaseURL}/${path}`;
          output.push({
            id: imgObj.path,
            path,
            created,
            ..._.pick(metadata, metadataKeys),
          });
        })
        .catch((err) => console.warn(`${path}: ${err}`));
    })
  ).then((results) => {
    imageStatsCache = output;
    console.log(`imageStatsCache has ${output.length} entries`);
    return output;
  });
}

function returnAnImageStat(imgObj) {
  let { path } = imgObj;
  return sharp(`${imageDirectoryPath}/${path}`)
    .metadata()
    .catch((err) => console.warn(`${path}: ${err}`))
    .then(function (metadata) {
      path = `${staticImageBaseURL}/${path}`;

      return {
        id: imgObj.path,
        path,
        ..._.pick(metadata, metadataKeys),
      };
    })
    .catch((err) => console.warn(`${path}: ${err}`));
}

function calculateMatrix(setup) {
  size = setup.width;
  var rows = _.map(_.range(0, size), (index) => {
    var col = _.map(_.range(0, size), (colIndex) => {
      return colIndex + size * index;
    });
    if (index % 2 && setup.zigzag) col.reverse();
    return col.reverse();
    //return col;
  });

  return _.flatten(rows);
}

function getImgPixelsBuffer(img, setup, background) {
  const size = setup.width;
  //const background = setup.background || "#000000";
  var promise = returnAnImageStat({ path: img })
    .then((metadata) => {
      return metadata;
    })
    .then((metadata) => {
      const rotations = {
        topleft: 90,
        topright: 0,
        bottomleft: 180,
        bottomright: 270,
      };
      if (metadata.pages > 1) {
        const operations = _.map(_.range(0, metadata.pages), (page) => {
          return sharp(`${imageDirectoryPath}/${img}`, { page: page })
            .resize(setup.width, setup.height, {
              kernel:
              setup.width < metadata.width
                  ? sharp.kernel.lanczos3
                  : sharp.kernel.nearest,
            })
            .flatten({ background })
           // .rotate(rotations[setup.start] || 0)
            .raw()
            .toBuffer({ resolveWithObject: true })
            .then({
              onfulfilled: (result) => {
                return { metadata, result };
              },
            });
        });
        return Promise.all(operations);
      } else {
        return sharp(`${imageDirectoryPath}/${img}`)
          .resize(setup.width, setup.height, {
            kernel:
                setup.width < metadata.width || setup.height < metadata.height
                ? sharp.kernel.lanczos3
                : sharp.kernel.nearest,
          })
          .flatten({ background: background })
         // .rotate(rotations[setup.start] || 0)
          .raw()
          .toBuffer({ resolveWithObject: true })
          .then((result) => result);
      }
    });

  return promise;
}
