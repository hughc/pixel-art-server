import _ from 'underscore';
import { Data } from '../utils/data.js';
import { getAllImageStats } from '../utils/get_image_stat.js';
import { getImgPixelsBuffer } from '../utils/get_pixel_buffer.js';

export function getImage (req, res) {
    let { id, width = 8, height = 8 } = req.query;
    width = parseInt(width);
    height = parseInt(height);

    let setup = _.findWhere(Data.clients, { id });
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
    let imageset = _.findWhere(Data.playlists, { id: parseInt(setup.imagesetId) });
    if (!imageset) {
      console.warn(`imageset not found for id '${setup.imagesetId}'`);
      imageset = Data.playlists[0] || {};
    }
    let { images, index, duration, brightness, backgroundColor } = imageset;
    var imageCount = images?.length;
    if (_.isUndefined(index))
      index = 0;
    if (index >= imageCount)
      index = 0;
    const imageStats = getAllImageStats();
    var path = images?.[index] || imageStats?.[_.random(imageStats.length - 1)].id;
    if (!path) {
      res.send(JSON.stringify({ warning: 'no playlist and no backup image' }));
      return;
    }

    imageset.index = index + 1;
    console.log({ path });

    backgroundColor = backgroundColor || "#000000";
    const pixelBufferOp = getImgPixelsBuffer(path, setup, backgroundColor);
    const metadata = _.findWhere(imageStats, { id: path });
    let frames, info;
    console.log({ delay: metadata.delay });
    return pixelBufferOp.then((result) => {
      if (metadata?.pages > 1) {
        frames = _.pluck(result, "data");
        info = _.pluck(result, "info");
      } else {
        frames = [result.data];
        info = [{}];
      }
      console.log({ frames: frames.length });
      const rows = _.reduce(frames, (memo, frameData, frameIndex) => {
        // default to 15 FPS
        const duration = metadata?.delay?.[frameIndex] || Math.round(1000 / 15);
        console.log({ duration });
        var rgb = _.compact(
          // frameData is a linear arry of r,g,b values, starting at top left
          _.map(frameData, (dp, index) => {
            if (index % 3)
              return;
            let r = parseInt(dp).toString(16);
            r = r.length == 2 ? r : '0' + r;
            let g = parseInt(frameData[index + 1]).toString(16);
            g = g.length == 2 ? g : '0' + g;
            let b = parseInt(frameData[index + 2]).toString(16);
            b = b.length == 2 ? b : '0' + b;
            return r + g + b;
          })
        );
        // console.log(rgb);
        let linearCount = 0;
        for (let rowIndex = 0; rowIndex < setup.height; rowIndex++) {
          const pixels = [];
          for (let col = 0; col < setup.width; col++) {
            pixels.push(rgb[linearCount]);
            linearCount++;
          }
          const row = {frame: frameIndex, duration, row: rowIndex, pixels}
          memo.push(row)
        }
        return memo //{ rows, duration, frame: frameIndex };
      }, []);
      console.log(`>> server returns ${path} with ${rows.length} rows over ${frames.length} frames`);
      // add extra metadata
      duration = duration || 10;
      brightness = brightness || 25;
      const output = {meta: { path, duration, brightness, frames: frames.length, width, height}, rows };
      res.removeHeader('transfer-encoding');
      res.contentType("application/json");
      res.send(JSON.stringify(output));
    });
  };
