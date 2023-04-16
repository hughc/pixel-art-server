import fsextra from 'fs-extra';
const { writeJSONSync } = fsextra;
import { Data } from "../utils/data.js";

export function replaceImageSet(req, res) {
    console.log('app.post("/imageset"', req.body);
    const imagesetData = _.pick(
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
  }

// saves to fiska nd updates cache in memory
function saveImageset(imagesetData, overWriteFlag) {
  existingImageset = _.findWhere(Data.playlists, { id: imagesetData.id });
  let updateToDisk = false;
  if (existingImageset && overWriteFlag) {
    const pos = Data.playlists.indexOf(existingImageset);
    Data.playlists.splice(pos, 1, imagesetData);
    console.log({ playlists: Data.playlists });
    updateToDisk = true;
  } else if (!existingImageset) {
    Data.playlists.push(imagesetData);
    updateToDisk = true;
  }
  if (updateToDisk) writeJSONSync(playlistFilePath, Data.playlists, {spaces: 2});
}