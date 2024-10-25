import { Octokit } from "@octokit/rest";
import { botUserName } from "../constants/index.js";
// import { botUserName } from "../constants/index.js";

export async function generateFinalMessage(
  message: string,
  missingFiles: number,
  errorCount: number,
  issueNumber: number
) {
  var token = process.env.GIST_TOKEN;
  if (!token) {
    return "Please add GIST_TOKEN in the environment variables";
  }
  const url = await createGist(token, message, `response-${issueNumber}.txt`);
  if (url) {
    const missing =
      missingFiles > 0
        ? `- ⚠️ ${missingFiles} files were missing in all the flows!`
        : "- ✅ All required files present!";
    const errors =
      errorCount > 0
        ? `📊 ${errorCount} errors were found in the logs!`
        : "🤩 No Errors found!";
    return `${missing}\n\n- 📌 The log validations executed and results can be found [here](${url})\n- ${errors}\n- ℹ️ To verify the logs again just tag me again at ${botUserName}`;
  } // 7 file missing \n log validation executed [result](url) 37 errros found
  return url ?? "Failed to create gist";
}

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

// ! multiple brances : 3. happy flow(no errors) 1. files errors 2. validation errors
