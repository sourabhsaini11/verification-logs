import { chatRunner } from "../controller/index.js";

const sampleChat = [
  {
    comment: `{
        "domain": "ONDC:FIS14",
        "version": "2.0.0",
        "npType": "bap",
        "gitLink": "https://github.com/ONDC-Official/verification-logs/tree/main/FIS14/Cybrilla"
    }`,
    type: "user",
  },
];

export async function runTest() {
  chatRunner(sampleChat[0], []);
}
