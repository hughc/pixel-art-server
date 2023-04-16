import { Data } from "../utils/data.js";


export function getClients(req, res) {
    res.send(Data.clients);
};