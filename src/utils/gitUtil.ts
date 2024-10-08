import axios from "axios";

export async function fetchGitHubFiles(
  owner: string,
  repo: string,
  branch: string,
  folderPath: string
) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}?ref=${branch}`;

  try {
    const response = await axios.get(apiUrl);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching files from GitHub:",
      error.response ? error.response.data.message : error.message
    );
    return [];
  }
}

export function parseGitHubUrl(url: string) {
  const match = url.match(
    /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+)/
  );
  if (match) {
    const [, owner, repo, branch, folderPath] = match;
    return { owner, repo, branch, folderPath };
  }
  return null;
}
async function fetchFileContentRaw(
  owner: string,
  repo: string,
  branch: string,
  filePath: string
) {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  try {
    const response = await axios.get(rawUrl);
    return response.data;
  } catch (error) {
    console.error("Error fetching file from raw URL:", error);
    return null;
  }
}

export async function exploreGitHubFolder(
  owner: string,
  repo: string,
  branch: string,
  folderPath: string,
  flow = ""
) {
  const files = await fetchGitHubFiles(owner, repo, branch, folderPath);
  const payloads: any = {
    payload: {},
  };
  const curls: LogVerificationPayload[] = [];
  for (const file of files) {
    if (file.type === "file") {
      console.log(`Fetching content for file: ${file.name}`);
      const content = await fetchFileContentRaw(owner, repo, branch, file.path);
      console.log(`\n=== Content of ${file.name} ===\n`);
      const data = content;
      let action = file.name.split(".")[0];
      payloads.payload[action] = data;
      console.log("\n=====================\n");
    } else if (file.type === "dir") {
      const flow = file.name;
      const ans = await exploreGitHubFolder(
        owner,
        repo,
        branch,
        file.path,
        flow
      );
      curls.push(ans as LogVerificationPayload);
    }
  }

  if (flow !== "") {
    const send: LogVerificationPayload = { ...templatePayload };
    send.flow = flow;
    send.payload = payloads.payload;
    return send;
  }
  return curls;
}

export interface LogVerificationPayload {
  domain: string;
  version: string;
  flow: string;
  bap_id: string;
  bpp_id: string;
  payload: Record<string, any>;
}

const templatePayload: LogVerificationPayload = {
  domain: "ONDC:FIS14",
  version: "2.0.0",
  flow: "",
  bap_id: "BUYER_APP_SUBSCRIBER_ID",
  bpp_id: "SELLER_APP_SUBSCRIBER_ID",
  payload: {},
};
