import { ensureDirSync } from "fs-extra";
import { resolve } from "path";
import { Data } from "../utils/data.js";

export function uploadFiles(req, res) {
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
    ensureDirSync(path.resolve(Data.basePath, `${Data.imageDirectoryPath}/${subdir ? subdir + "/" : ""}`));
    // Use the mv() method to place the file somewhere on your server
    const shortPath = `${subdir ? subdir + "/" : ""}${newName}`;
    const newPath = resolve(Data.basePath, `${Data.imageDirectoryPath}/${shortPath}`);
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
  }