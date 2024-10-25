import chalk from "chalk";
import { supportedDomains } from "../constants/index.js";
import { LogVerificationPayload } from "../types/interface.js";
import {
  generateMetaResponse,
  getRequiredStructure,
  sendVerificationPayload,
} from "./general.js";
import { exploreGitHubFolder, getStructureHelper } from "./gitUtil.js";

function verifyDomain(domain: string) {
  return supportedDomains.includes(domain);
}

export function validRequest(domain: string) {
  if (verifyDomain(domain)) {
    return {
      response: "",
      valid: true,
    };
  }
  return {
    response:
      `🚧 Oops! this Domain ${domain} is not yet supported by the bot \n > Supported Domains are: ${supportedDomains.join(
        ", "
      )}` +
      generateMetaResponse("failure", "domain not yet supported by the bot"),
    valid: false,
  };
}

export function validPullRequest(
  domain: string,
  validationType: string,
  changedFileNames: string[]
) {
  // If no files are changed, return an error.
  if (changedFileNames.length === 0) {
    return {
      response:
        "🧐 No changes found in the Pull Request! Cannot verify the logs." +
        generateMetaResponse("failure", "no changes found in the PR"),
      valid: false,
    };
  }

  // To track the np_name folders and errors
  let npNameSet = new Set<string>();
  let errors: string[] = [];
  let validations = ["RSF", "IGM", "TRANSACTION"];
  // add example path in the error message
  for (const file of changedFileNames) {
    const splitFilePath = file.split("/");

    // Check if the file path contains enough parts: domain, np_name, validationType, etc.
    if (splitFilePath.length < 4) {
      errors.push(
        `😕 The file path "${file}" does not follow the expected structure: {DOMAIN}/{NP_NAME}/{VALIDATION_TYPE}/{FLOW_NAME}/{ACTION.json}`
      );
      continue; // Skip further checks for this file
    }

    const [fileDomain, npName, fileValidationType] = splitFilePath;

    // Check if the validation type is valid
    if (!validations.includes(fileValidationType)) {
      errors.push(
        `🚫  Found an invalid validation type "${fileValidationType}" in the file "${file}". Please ensure the validation type is one of: ${validations.join(
          ", "
        )}.`
      );
    }

    // Check if the domain matches
    if (fileDomain !== domain) {
      errors.push(
        `🚫  Found changes outside the domain "${domain}" in the file "${file}". Please ensure all changes are in the correct domain.`
      );
    }
    // Add np_name to the set
    npNameSet.add(npName);
  }

  // If more than one np_name folder was found, return an error
  if (npNameSet.size > 1) {
    errors.push(
      `⚠️ Found changes in multiple NP's folders (${Array.from(npNameSet).join(
        ", "
      )}). Please ensure that all changes are within the folder of single NP.`
    );
  }
  const finalResponse =
    errors.join("\n") +
    `\n > Example path: ${domain}/{NP_NAME}/${validationType}/{FLOW_NAME}/{ACTION.json}` +
    generateMetaResponse(
      "failure",
      "please check the pr comments and correct the files"
    );
  // If any errors were collected, return them
  if (errors.length > 0) {
    return {
      response: finalResponse, // Join all errors into a single string
      valid: false,
    };
  }

  // If no errors, return valid
  return {
    response: "✅ All files are valid and within the same 'np_name' folder.",
    valid: true,
  };
}

export async function verifyLogs(
  domain: string,
  version: string,
  verificationType: string,
  owner: string,
  branch: string,
  folderPath: string,
  repoName: string
) {
  const struct = await verifyStructure(
    domain,
    version,
    verificationType,
    owner,
    branch,
    folderPath,
    repoName
  );
  if (!struct.valid) {
    return {
      response: struct.message as string,
      missingFiles: 0,
      errorCount: 0,
    };
  }
  const fixed = `${folderPath}/${verificationType}`;

  const curls = (await exploreGitHubFolder(
    owner,
    repoName.split("/")[1],
    branch,
    fixed
  )) as LogVerificationPayload[];
  for (const curl of curls) {
    curl.domain = domain;
    curl.version = version;
  }
  const finalResponse: any = {};
  for (const curl of curls) {
    finalResponse[curl.flow] = await sendVerificationPayload(curl);
  }
  finalResponse["missing-files"] = struct.message;
  const missingFilesSize = Array.isArray(struct.message)
    ? struct.message.length
    : 0;
  const errorCount = countErrorsInReports(finalResponse);
  return {
    response: JSON.stringify(finalResponse, null, 2),
    errorCount: errorCount,
    missingFiles: missingFilesSize,
  };
}

async function verifyStructure(
  domain: string,
  version: string,
  verificationType: string,
  owner: string,
  branch: string,
  folderPath: string,
  repoName: string
) {
  const requiredStruct = await getRequiredStructure(domain, version);
  if (!requiredStruct) {
    return {
      message: "🤯 ERROR:500,Could not fetch required structure",
      valid: false,
    };
  }
  const fixed = `${folderPath}/${verificationType}`;
  const requiredFiles = convertToFiles(requiredStruct, fixed);
  console.log(chalk.yellow(owner, repoName, branch, fixed));
  const commitedStruct = await getStructureHelper(
    owner,
    repoName.split("/")[1],
    branch,
    fixed
  );
  if (commitedStruct === undefined) {
    return {
      message: "🤯 ERROR:500,Could not fetch commited structure",
      valid: false,
    };
  }
  const commitedFiles = convertToFiles(commitedStruct, fixed);
  const missingFiles = requiredFiles.filter(
    (file) => !commitedFiles.includes(file)
  );
  return {
    message: missingFiles.length
      ? missingFiles
      : "✅ All required files are present",
    valid: true,
  };
}

function convertToFiles(
  requiredStruct: Record<string, string[]>,
  fixed: string
) {
  // domain/npName/validationType + /flowName/action.json
  let files: string[] = [];
  for (const flow in requiredStruct) {
    requiredStruct[flow].forEach((action) => {
      files.push(
        `${fixed}/${flow.toUpperCase()}/${action.toLocaleLowerCase()}.json`
      );
    });
  }
  return files;
}

type ReportObject = Record<string, any>;

function countErrorsInReports(data: Record<string, any>): number {
  let errorCount = 0;

  // Function to count all properties (errors) inside the report object recursively
  function countErrorsInReport(report: ReportObject): number {
    let count = 0;

    for (const key in report) {
      if (typeof report[key] === "object" && report[key] !== null) {
        // Recursively count errors if the value is an object
        count += countErrorsInReport(report[key]);
      } else {
        // Count this as an error (every key-value pair is considered an error)
        count++;
      }
    }

    return count;
  }

  // Loop over each top-level key in the provided data
  for (const key in data) {
    const item = data[key];

    // If the item contains a "report" field, count its errors
    if (item && item.report) {
      errorCount += countErrorsInReport(item.report);
    }
  }

  return errorCount;
}
