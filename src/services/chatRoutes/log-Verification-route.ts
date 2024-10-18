import { PrChatBotRequiments } from "../../types/interface.js";
import {
  validPullRequest,
  validRequest,
  verifyLogs,
} from "../../utils/log-verfication-utils.js";
import { ConversationRoute } from "./conversation-route.js";

export class LogVerificationRoute extends ConversationRoute {
  domain: string | null = null;
  version: string | null = null;
  npType: "BAP" | "BPP" | "BOTH" | null = null;
  transactionType: "RSF" | "IGM" | "TRANSACTION" | null = null;
  constructor() {
    super();
  }
  routeTrigger(): string {
    return "Comment 'VERIFY_LOGS' to verify your the logs";
  }
  isTriggered(latestMessage: string): boolean {
    return latestMessage.includes("VERIFY_LOGS");
  }
  async generateNextMessage(
    latestMessage: string,
    userResponses: string[],
    botResponses: string[],
    context: PrChatBotRequiments
  ) {
    // class logic
    // try loading the chat from previous messages
    // chat logic
    // perform folder validations
    // verify logs
    if (!this.infoComplete()) {
      return this.getFirstMessage();
    }
    const request = validRequest(this.domain as string); // verify domain
    if (!request.valid) {
      return request.response;
    }
    const verifyPr = validPullRequest(
      this.domain as string,
      context.changedFiles
    );
    if (!verifyPr.valid) {
      return verifyPr.response;
    }

    return await verifyLogs(
      this.domain as string,
      this.version as string,
      this.transactionType as string,
      context.forkOwnerId,
      context.forkBranch,
      `${this.domain}/`,
      context.forkRepoName
    );
  }
  private infoComplete() {
    return this.domain && this.version && this.npType;
  }
  private getFirstMessage(): string {
    return `Hi, please fill out the following template and comment back:
  
  \`\`\`json
  {
    "domain": "ENTER DOMAIN",
    "version": "ENTER VERSION",
    "npType": "BAP,BPP or BOTH",
    "validationType": "RSF or IGM or TRANSACTION",
  }
  \`\`\`

   - Provide a valid json 
  `;
  }
}
