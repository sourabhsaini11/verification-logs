import chalk from "chalk";
import { PrChatBotRequiments } from "../../types/interface.js";
import {
  extractJSONObject,
  generateMetaResponse,
} from "../../utils/general.js";
import { labelPr } from "../../utils/gitUtil.js";
import {
  validPullRequest,
  validRequest,
  verifyLogs,
} from "../../utils/log-verfication-utils.js";
import { generateFinalMessage } from "../gistService.js";
import { ConversationRoute } from "./conversation-route.js";

export class LogVerificationRoute extends ConversationRoute {
  domain: string | null = null;
  version: string | null = null;
  npType: "BAP" | "BPP" | "BOTH" | null = null;
  validationType: "RSF" | "IGM" | "TRANSACTION" | null = null;
  constructor() {
    super();
  }
  routeTrigger(): string {
    return "Comment 'VERIFY_LOGS' to verify your the logs";
  }
  saveWord(): string {
    return "ONDC-LOG-VERIFICATION-UTILITY";
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
    this.loadChat(latestMessage, userResponses, botResponses);
    // chat logic
    // perform folder validations
    // verify logs
    if (!this.infoComplete()) {
      return (
        this.getFirstMessage(false) +
        generateMetaResponse("pending", "missing required information")
      );
    }
    const request = validRequest(this.domain as string); // verify domain
    if (!request.valid) {
      return request.response;
    }
    const verifyPr = validPullRequest(
      this.domain as string,
      this.validationType as string,
      context.changedFiles
    );
    if (!verifyPr.valid) {
      return verifyPr.response;
    }
    labelPr(this.domain as string, context.context);
    const spliFilesPath = context.changedFiles[0].split("/");
    const logs = await verifyLogs(
      this.domain as string,
      this.version as string,
      this.validationType as string,
      context.forkOwnerId,
      context.forkBranch,
      `${spliFilesPath[0]}/${spliFilesPath[1]}`,
      context.forkRepoName
    );

    const gist = await generateFinalMessage(logs, context.issueNumber);
    return gist + generateMetaResponse("success", "pull request is valid");
  }
  private loadChat(
    newMessage: string,
    userResponses: string[],
    botResponses: string[]
  ) {
    console.log(chalk.black("botResponses", botResponses));
    console.log(chalk.bold("userResponses", userResponses));
    const messages = [...userResponses, newMessage];
    for (const mess of messages) {
      const jsonData = extractJSONObject(mess);
      if (jsonData) {
        if (jsonData.domain) this.domain = jsonData.domain;
        if (jsonData.version) this.version = jsonData.version;
        if (jsonData.npType) this.npType = jsonData.npType;
        if (jsonData.validationType)
          this.validationType = jsonData.validationType;
      }
    }
  }
  private infoComplete() {
    if (
      !["RSF", "IGM", "TRANSACTION"].includes(this.validationType as string)
    ) {
      return false;
    }
    return this.domain && this.version && this.npType && this.validationType;
  }
  private partialInfo() {
    return this.domain || this.version || this.npType || this.validationType;
  }
  private getFirstMessage(firstTime = true): string {
    let message = `Hi, please fill out the following template and comment back:
  \`\`\`json
  {
    "domain": "ENTER DOMAIN",
    "version": "ENTER VERSION",
    "npType": "BAP or BPP or BOTH",
    "validationType": "RSF or IGM or TRANSACTION"
  }
  \`\`\`

   - Provide a valid json 
  `;
    // ! improve valid json message // incorrect json fromat provided
    if (!firstTime && this.partialInfo()) {
      if (!this.domain) message += "- _currently missing domain_ \n";
      if (!this.version) message += "- _currently missing version_ \n";
      if (!this.npType) message += "- _currently missing npType_ \n";
      if (!this.validationType)
        message += "- _currently missing validationType_ \n";
    }
    return message;
  }
}
