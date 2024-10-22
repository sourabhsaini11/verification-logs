// import { IssueComment, LogVerificationPayload } from "../types/interface.js";
// import {
//   extractJSONObject,
//   getRequiredStructure,
//   sendVerificationPayload,
// } from "./general.js";
// import {
//   exploreGitHubFolder,
//   // getCommitedStructure,
//   parseGitHubUrl,
// } from "./gitUtil.js";

// export class VerifyLogs {
//   domain: string | null = null;
//   version: string | null = null;
//   npType: string | null = null;
//   gitLink: string | null = null;
//   commonStructure: Record<string, string[]> = {};
//   requiredSturcture: Record<string, string[]> = {};
//   stepNum: number;

//   constructor() {
//     this.stepNum = 0;
//   }

//   async run(comment: IssueComment) {
//     let response = "Please fill out the details first";
//     if (comment.type === "user") {
//       if (this.stepNum <= 1) {
//         try {
//           this.extractData(comment.comment);
//         } catch (e) {
//           var next = this.getNextMessage();
//           next += "\n" + "- Provide a Valid JSON";
//           return {
//             response: next,
//             domain: this.domain,
//             required: null,
//           };
//         }
//         this.tryIncrementStepNum();
//         response = this.getNextMessage();
//       }

//       if (this.stepNum == 2) {
//         response = await this.verifyStructure();
//         console.log("common", this.commonStructure);
//         if (Object.keys(this.commonStructure).length > 0) {
//           this.stepNum = 3;
//         }
//       }
//       if (this.stepNum == 3) {
//         const res = await this.verifyLogs();
//         if (res) {
//           response += res;
//           this.stepNum = 4;
//         } else {
//           response = "Failed to verify logs";
//         }
//       }
//     }
//     if (this.stepNum >= 4) {
//       response +=
//         "\n To verify more logs or to re-verify the logs, please open or re-open a new PR";
//     }
//     return {
//       response: response,
//       domain: this.domain,
//       required: this.requiredSturcture,
//     };
//   }

//   getNextMessage() {
//     if (this.domain === null || this.version === null || this.npType === null) {
//       return logVerifyOutputs[0];
//     }
//     if (this.gitLink === null) {
//       return logVerifyOutputs[1];
//     }
//     return "-1";
//   }
//   extractData(userMessage: string) {
//     try {
//       const json = extractJSONObject(userMessage);
//       if (json.domain) this.domain = json.domain;
//       if (json.version) this.version = json.version;
//       if (json.npType) this.npType = json.npType;
//       if (json.gitLink) this.gitLink = json.gitLink;
//       return "Data extracted successfully";
//     } catch (e) {
//       console.error("Failed to parse JSON:", e);
//       throw new Error("Failed to parse JSON");
//     }
//   }

//   async verifyStructure() {
//     if (
//       this.domain === null ||
//       this.version === null ||
//       this.npType === null ||
//       this.gitLink === null
//     ) {
//       return "Please fill out the details first";
//     }
//     const requiredStructure = await getRequiredStructure(
//       this.domain,
//       this.version
//     );
//     console.log("required", requiredStructure);
//     if (requiredStructure === undefined) {
//       return "**🚨 Failed to fetch required structure, please check the domain and version**";
//     }
//     this.requiredSturcture = requiredStructure;

//     // const commitedStructure = await getCommitedStructure(this.gitLink);
//     // if (commitedStructure === undefined) {
//     //   return "**🚨 Failed to fetch commited structure, please check the GitHub link**";
//     // }
//     // const comparison = await compareStructures(
//     //   requiredStructure,
//     //   commitedStructure
//     // );
//     // this.commonStructure = comparison.common;
//     // if (Object.keys(comparison.error).length > 0) {
//     //   return JSON.stringify(comparison.error, null, 2);
//     // }
//     return "good";
//   }

//   async verifyLogs() {
//     if (
//       this.domain === null ||
//       this.version === null ||
//       this.npType === null ||
//       this.gitLink === null
//     ) {
//       return "Please fill out the details first";
//     }
//     const parsedUrl = parseGitHubUrl(this.gitLink);

//     if (!parsedUrl) {
//       console.log("Invalid GitHub URL format.");
//       return;
//     }
//     const { owner, repo, branch, folderPath } = parsedUrl;
//     const curls = (await exploreGitHubFolder(
//       owner,
//       repo,
//       branch,
//       folderPath
//     )) as LogVerificationPayload[];
//     console.log("curlres", curls);
//     for (const curl of curls) {
//       curl.domain = this.domain;
//       curl.version = this.version;
//     }
//     const finalResponse: any = {};
//     for (const curl of curls) {
//       finalResponse[curl.flow] = await sendVerificationPayload(curl);
//     }
//     return JSON.stringify(finalResponse, null, 2);
//   }
//   tryIncrementStepNum() {
//     if (this.stepNum == 0) {
//       if (
//         this.domain !== null &&
//         this.version !== null &&
//         this.npType !== null
//       ) {
//         this.stepNum = 1;
//       }
//     }
//     if (this.stepNum == 1) {
//       if (this.gitLink !== null) {
//         this.stepNum = 2;
//       }
//     }
//   }
// }

// export const logVerifyOutputs = [
//   `Hi, please fill out the following template and comment back:

//   \`\`\`json
//   {
//     "domain": "ENTER DOMAIN",
//     "version": "ENTER VERSION",
//     "npType": "BAP,BPP or BOTH",
//     "gitLink": "https://github.com/{User}/v1.2.0-logs/tree/master/{Name}/RSF"
//   }
//   \`\`\`

//    - Tag me in the comment
//   `,
//   `Can you provide me the folder path for the logs? in your forked repo \n
//   example: https://github.com/{User}/v1.2.0-logs/tree/master/{Name}/RSF`,
// ];
