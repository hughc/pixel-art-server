import fsextra from 'fs-extra';
import _ from 'underscore';
const { writeJSONSync } = fsextra;

import { Data } from "../utils/data.js";

export function saveClient(clientData, overWriteFlag) {
    const existingClient = _.findWhere(Data.clients, { id: clientData.id });
    let updateToDisk = false;
    if (existingClient && overWriteFlag) {
      const pos = Data.clients.indexOf(existingClient);
      Data.clients.splice(pos, 1, clientData);
      console.log({'server clients': Data.clients });
      updateToDisk = true;
    } else if (!existingClient) {
      Data.clients.push(clientData);
      updateToDisk = true;
    }
    if(updateToDisk) writeJSONSync(Data.clientsFilePath, Data.clients, {spaces: 2});
  }