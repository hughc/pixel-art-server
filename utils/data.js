import fsextra from 'fs-extra';
const { readJSONSync, existsSync } = fsextra;
import {resolve} from 'path'

import { dirname } from 'path';
import { fileURLToPath } from 'url';



export class Data {
    static staticImageBaseURL = "/image-preview";
    static clients = [];
    static playlists = [];
    static imageDirectoryPath;
    static playlistFilePath;
    static clientsFilePath;
    static basePath;
    
    constructor(baseURL) {
        Data.basePath = dirname(fileURLToPath(baseURL));
         Data.imageDirectoryPath = resolve(Data.basePath, 'img');
         Data.playlistFilePath = resolve(Data.basePath, 'data/playlists.json');
         Data.clientsFilePath = resolve(Data.basePath,"data/clients.json");

         
        if (existsSync(Data.playlistFilePath)) {
            Data.playlists = readJSONSync(Data.playlistFilePath);
        }
        if (existsSync(Data.clientsFilePath)) {
            Data.clients = readJSONSync(Data.clientsFilePath);
        } 
    }
};