import axios from "axios";
import { LogVerificationPayload } from "../types/interface.js";
import { botUserName } from "../constants/index.js";
// import { Context } from "probot/lib/context.js";
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

const templatePayload: LogVerificationPayload = {
  domain: "ONDC:FIS14",
  version: "2.0.0",
  flow: "",
  bap_id: "BUYER_APP_SUBSCRIBER_ID",
  bpp_id: "SELLER_APP_SUBSCRIBER_ID",
  payload: {},
};

async function getStructureHelper(
  owner: string,
  repo: string,
  branch: string,
  folderPath: string
) {
  const files = await fetchGitHubFiles(owner, repo, branch, folderPath);
  const struct: any = {};
  const li: string[] = [];
  for (const file of files) {
    if (file.type === "file") {
      li.push(file.name.split(".")[0]);
    } else if (file.type === "dir") {
      const subStruct = await getStructureHelper(
        owner,
        repo,
        branch,
        file.path
      );
      struct[file.name] = subStruct;
    }
  }
  if (li.length > 0) {
    return li;
  }
  return struct;
}

export async function getCommitedStructure(url: string) {
  const parsedUrl = parseGitHubUrl(url);
  if (!parsedUrl) {
    console.log("Invalid GitHub URL format.");
    return;
  }
  const { owner, repo, branch, folderPath } = parsedUrl;
  const structure = await getStructureHelper(owner, repo, branch, folderPath);
  return structure;
}

export async function generateFinalMessage(message: string) {
  var token = process.env.GIST_TOKEN;
  if (!token) {
    return "Please add GIST_TOKEN in the environment variables";
  }
  const url = await createGist(token, message);
  if (url) {
    return `:white_check_mark: [View the logs](${url})
    \n please tag me at ${botUserName} in a comment to re-verfiy the logs. or 
    open a new PR to verify new logs.`;
  }
  return url ?? "Failed to create pasteBin";
}

import { Octokit } from "@octokit/rest";

/**
 * Creates a GitHub Gist with the provided content and returns the Gist URL.
 *
 * @param authToken - Your GitHub personal access token with 'gist' scope.
 * @param message - The content to be saved in the Gist.
 * @param fileName - (Optional) The name of the file in the Gist. Defaults to 'response.txt'.
 * @param isPublic - (Optional) Whether the Gist should be public or secret. Defaults to true (public).
 * @returns The URL of the created Gist.
 */
async function createGist(
  authToken: string,
  message: string,
  fileName: string = "response.txt",
  isPublic: boolean = true
): Promise<string | undefined> {
  // Initialize Octokit with authentication
  const octokit = new Octokit({ auth: authToken });

  try {
    // Create the Gist
    const response = await octokit.gists.create({
      files: { [fileName]: { content: message } },
      public: isPublic,
    });

    // Return the URL of the created Gist
    return response.data.html_url;
  } catch (error: any) {
    // Handle errors
    throw new Error(`Failed to create Gist: ${error.message}`);
  }
}

export async function labelPr(domain: string, context: any) {
  const prNumber = context.payload.issue.number;
  const owner = context.repo().owner;
  const repo = context.repo().repo;

  try {
    // Fetch all labels in the repository
    const { data: repoLabels } = await context.octokit.issues.listLabelsForRepo(
      {
        owner,
        repo,
      }
    );
    console.log("repoLabels", repoLabels);
    // Check if the specified label exists in the repository
    const labelExistsInRepo = repoLabels.some(
      (label: any) => label.name === domain
    );
    if (!labelExistsInRepo) {
      console.log(`Label "${domain}" does not exist in the repository.`);
      return; // Exit if the label does not exist
    }

    // Check if the label already exists on the PR
    const { data: prLabels } = await context.octokit.issues.listLabelsOnIssue({
      owner,
      repo,
      issue_number: prNumber,
    });

    const labelExistsOnPr = prLabels.some(
      (label: any) => label.name === domain
    );
    if (labelExistsOnPr) {
      console.log(`Label "${domain}" already exists on PR #${prNumber}`);
      return; // Exit if the label already exists on the PR
    }

    // Add the label to the PR
    await context.octokit.issues.addLabels({
      owner,
      repo,
      issue_number: prNumber,
      labels: [domain],
    });

    console.log(`Label "${domain}" added to PR #${prNumber}`);
  } catch (error) {
    console.error("Error labeling PR:", error);
  }
}
