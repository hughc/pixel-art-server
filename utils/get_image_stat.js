import sharp from "sharp";
import { Data } from "./data.js";
import fsextra from 'fs-extra';
import _ from "underscore";
const { readdirSync, statSync } = fsextra;

const metadataKeys = ["width", "height", "format", "hasAlpha", "pages", "delay"];

let imageDirectoryCache = [];
let imageStatsCache = [];

export function returnAnImageStat(imgObj) {
    let { path } = imgObj;
    return sharp(`${Data.imageDirectoryPath}/${path}`)
      .metadata()
      .catch((err) => console.warn(`${path}: ${err}`))
      .then(function (metadata) {
        path = `${Data.staticImageBaseURL}/${path}`;
  
        return {
          id: imgObj.path,
          path,
          ..._.pick(metadata, metadataKeys),
        };
      })
      .catch((err) => console.warn(`${path}: ${err}`));
  }

  export function getAllImageStats() {
    if (!_.isEmpty(imageStatsCache)) return imageStatsCache;
    var images = gatherAllImages(Data.imageDirectoryPath);
    var output = [];
    return Promise.all(
      images.map((imgObj) => {
        let { path, created } = imgObj;
        return sharp(`${Data.imageDirectoryPath}/${path}`)
          .metadata()
          .catch((err) => console.warn(`${path}: ${err}`))
          .then(function (metadata) {
            path = `${Data.staticImageBaseURL}/${path}`;
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

  function gatherAllImages(basePath) {
    if (!_.isEmpty(imageDirectoryCache)) {
      console.log("returning cached file values");
      return imageDirectoryCache;
    }
    const recursiveList = (dir, list) => {
      const inThisDir = readdirSync(dir);
      _.each(inThisDir, (fileOrFolder) => {
        const conCatPath = `${dir}/${fileOrFolder}`;
        const stat = statSync(conCatPath);
        if (stat.isDirectory()) {
          list = recursiveList(conCatPath, list);
        } else if (fileOrFolder.match(/\.gif|\.jpg|\.png|\.jpeg/g)) {
          // console.log({ stat });
          const path = conCatPath.substring(basePath.length + 1);
          const created = stat.birthtimeMs;
          list.push({ path, created });
        }
      });
      return list;
    };
    imageDirectoryCache = recursiveList(basePath, []);
    return imageDirectoryCache;
  }