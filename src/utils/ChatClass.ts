import {
  exploreGitHubFolder,
  LogVerificationPayload,
  parseGitHubUrl,
} from "./gitUtil.js";

export class VerifyLogs {
  domain: string | null = null;
  version: string | null = null;
  npType: string | null = null;
  gitLink: string | null = null;

  getNextMessage() {
    if (this.domain === null || this.version === null || this.npType === null) {
      return logVerifyOutputs[0];
    }
    if (this.gitLink === null) {
      return logVerifyOutputs[1];
    }
    return "-1";
  }
  extractData(userMessage: string) {
    try {
      const json = this.extractJSONObject(userMessage);
      if (json.domain) this.domain = json.domain;
      if (json.version) this.version = json.version;
      if (json.npType) this.npType = json.npType;
      if (json.gitLink) this.gitLink = json.gitLink;
      return "Data extracted successfully";
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      return "Plase re-check the JSON format";
    }
  }

  verifyStructure() {
    return true;
  }

  async verifyLogs() {
    if (
      this.domain === null ||
      this.version === null ||
      this.npType === null ||
      this.gitLink === null
    ) {
      return "Please fill out the details first";
    }
    const parsedUrl = parseGitHubUrl(this.gitLink);

    if (!parsedUrl) {
      console.log("Invalid GitHub URL format.");
      return;
    }
    const { owner, repo, branch, folderPath } = parsedUrl;
    const curls = (await exploreGitHubFolder(
      owner,
      repo,
      branch,
      folderPath
    )) as LogVerificationPayload[];
    for (const curl of curls) {
      curl.domain = this.domain;
      curl.version = this.version;
    }
    return curls;
  }

  extractJSONObject(str: string) {
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
}

export const logVerifyOutputs = [
  `Hi, Is this PR for your log verifications? 
  If so, please fill out the following template and comment back:
  
  \`\`\`json
  {
    "domain": "ENTER DOMAIN",
    "version": "ENTER VERSION",
    "npType": "BAP,BPP or BOTH"
  }
  \`\`\`
  
  Otherwise, please ignore this.
  `,
  `Can you provide me the folder path for the logs? in your forked repo \n
  example: https://github.com/{User}/v1.2.0-logs/tree/master/{Name}/RSF`,
];
