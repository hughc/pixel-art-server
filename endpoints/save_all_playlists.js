import fsextra from 'fs-extra';
const { writeJSONSync } = fsextra;
import { Data } from "../utils/data.js";

export function saveAllPlaylists(playlists) {
  console.log("saveAllPlaylists", playlists.length);
  writeJSONSync(Data.playlistFilePath, playlists, { spaces: 2 });
  Data.playlists = playlists;
}
