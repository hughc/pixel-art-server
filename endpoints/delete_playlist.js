import _ from 'underscore';
import { saveAllPlaylists } from './save_all_playlists.js';
import { Data } from '../utils/data.js';

export function deletePlaylist(req, res) {
  console.log("Got a DELETE request at /imageset");
  const uid = req.body.uid;
  Data.playlists = _.reject(Data.playlists, (imageset) => imageset.id == uid);
  saveAllPlaylists(Data.playlists);
  res.send({ success: true, message: "imageset removed" });
}
