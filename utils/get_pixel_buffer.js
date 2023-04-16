import sharp from "sharp";
import _ from "underscore";
import { Data } from "./data.js";
import { returnAnImageStat } from "./get_image_stat.js";

export function getImgPixelsBuffer(img, setup, background) {
    const size = setup.width;
    //const background = setup.background || "#000000";
    var promise = returnAnImageStat({ path: img })
      .then((metadata) => {
        return metadata;
      })
      .then((metadata) => {
        if (metadata.pages > 1) {
          const operations = _.map(_.range(0, metadata.pages), (page) => {
            return sharp(`${Data.imageDirectoryPath}/${img}`, { page: page })
              .resize(setup.width, setup.height, {
                kernel:
                setup.width < metadata.width
                    ? sharp.kernel.lanczos3
                    : sharp.kernel.nearest,
              })
              .flatten({ background })
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
          return sharp(`${Data.imageDirectoryPath}/${img}`)
            .resize(setup.width, setup.height, {
              kernel:
                  setup.width < metadata.width || setup.height < metadata.height
                  ? sharp.kernel.lanczos3
                  : sharp.kernel.nearest,
            })
            .flatten({ background: background })
            .raw()
            .toBuffer({ resolveWithObject: true })
            .then((result) => result);
        }
      });
  
    return promise;
  }