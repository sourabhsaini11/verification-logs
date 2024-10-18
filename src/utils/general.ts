import axios from "axios";
import { botUserName, logVerificationUtilityUrl } from "../constants/index.js";
import { LogVerificationPayload } from "../types/interface.js";

export function checkBotTagged(message: string) {
  return message.includes(botUserName);
}

export function extractJSONObject(str: string) {
  // Use a regular expression to match a JSON-like object
  const jsonMatch = str.match(/{[^}]+}/);

  if (jsonMatch) {
    // Extract the JSON-like string
    let jsonString = jsonMatch[0];

    // Replace single quotes with double quotes to make it valid JSON
    jsonString = jsonString.replace(/'/g, '"');

    try {
      // Parse and return the JSON object
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error("Invalid JSON");
    }
  }

  return null; // Return null if no JSON-like object is found
}

export async function compareStructures(
  requiredStructure: Record<string, string[]>,
  providedStructure: Record<string, string[]>
) {
  const errorObj: any = {};
  const commonStructure: Record<string, string[]> = {};
  for (const key in requiredStructure) {
    if (!providedStructure[key]) {
      errorObj[key] = "FOLDER MISSING";
    } else {
      const requiredKeys = requiredStructure[key].map((key) =>
        key.toLowerCase()
      );
      const providedKeys = providedStructure[key].map((key) =>
        key.toLowerCase()
      );
      const missingKeys = requiredKeys.filter(
        (key) => !providedKeys.includes(key)
      );
      commonStructure[key] = providedKeys.filter((key) =>
        requiredKeys.includes(key)
      );
      if (missingKeys.length > 0) {
        errorObj[key] = missingKeys;
      }
    }
  }
  return { error: errorObj, common: commonStructure };
}

export async function getRequiredStructure(domain: string, version: string) {
  try {
    const dom = getSimplifiedDomain(domain);
    const url = logVerificationUtilityUrl + `/api/validation-format/${dom}`;
    const response = await axios.get(url, {
      params: {
        version: version,
        domain: domain,
      },
    });
    return response.data.response;
  } catch (error) {
    console.error("Error fetching required structure", error);
    return undefined;
  }
}

export async function sendVerificationPayload(payload: LogVerificationPayload) {
  try {
    const domain = getSimplifiedDomain(payload.domain);
    const url = logVerificationUtilityUrl + `/api/validate/${domain}`;
    const reponse = await axios.post(url, payload);
    return reponse.data;
  } catch (error: any) {
    console.log(error.response.status);
    if (error.response.status === 400) {
      return error.response.data.response;
    }
    // console.error("Error sending verification payload", error);
    return "Error sending verification payload : " + error;
  }
}

function getSimplifiedDomain(domain: string) {
  console.log("Domain:", domain);
  return "fis";
}

export function generateFolderTree(
  folders: Record<string, string[]>,
  validationType: string,
  domain: string
): string {
  let tree = `${domain}/${validationType}/`;

  for (const folder in folders) {
    // Add folder name to tree
    tree += `${folder}/\n`;

    // Iterate over the list of files in the folder
    folders[folder].forEach((file) => {
      tree += `  └── ${file.toLocaleLowerCase()}.json\n`;
    });
  }

  return tree;
}
