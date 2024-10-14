import { IssueComment, LogVerificationResponse } from "../types/interface.js";
import { VerifyLogs } from "../utils/ChatClass.js";
export async function chatRunner(
  latestComment: IssueComment,
  previousComments: IssueComment[]
) {
  const verifyLogs = new VerifyLogs();
  let response: LogVerificationResponse = {
    response: "Please fill out the details first",
    domain: "",
    required: null,
  };
  for (const comment of previousComments) {
    response = await verifyLogs.run(comment);
  }
  response = await verifyLogs.run(latestComment);
  return response;
}
