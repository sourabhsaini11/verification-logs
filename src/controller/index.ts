// import { IssueComment, LogVerificationResponse } from "../types/interface.js";
// // import { VerifyLogs } from "../utils/ChatClass.js";
// export async function chatRunner(
//   latestComment: IssueComment,
//   previousComments: IssueComment[]
// ) {
//   try {
//     // const verifyLogs = new VerifyLogs();
//     let response: LogVerificationResponse = {
//       response: "Please fill out the details first",
//       domain: "",
//       required: null,
//     };
//     for (const comment of previousComments) {
//       response = await verifyLogs.run(comment);
//     }
//     response = await verifyLogs.run(latestComment);
//     return response;
//   } catch (e: any) {
//     console.error(e);
//     return {
//       response: `Error Occured while running the chat: ${e?.message}`,
//       domain: null,
//       required: null,
//     };
//   }
// }
