import { botUserName } from "../constants/index.js";
import { ConversationRoute } from "../services/chatRoutes/conversation-route.js";
import { LogVerificationRoute } from "../services/chatRoutes/log-Verification-route.js";
import { PrChatBotRequiments } from "../types/interface.js";

export class ChatBotController {
  routes: ConversationRoute[] = [];
  currentRoute: ConversationRoute | undefined;
  userResponses: string[] = [];
  botResponses: string[] = [];
  changedFilesNames: string[] = [];
  context: PrChatBotRequiments;
  constructor(
    requirements: PrChatBotRequiments,
    userResponses = [],
    botResponses = []
  ) {
    this.InitBot();
    this.userResponses = userResponses;
    this.botResponses = botResponses;
    this.context = requirements;
  }
  private InitBot() {
    this.routes = [new LogVerificationRoute()];
    this.currentRoute = undefined;
    this.userResponses = [];
    this.botResponses = [];
  }

  public initMessage() {
    let message = "";
    for (const route of this.routes) {
      message += `\n- ${route.routeTrigger()}`;
    }
    return message;
  }
  public replyToUser(message: string) {
    if (message === "BOT_NHK") {
      this.InitBot();
      return "🔄 Conversation reset successfully! \n" + this.initMessage();
    }
    let reply =
      this.currentRoute === undefined
        ? this.tryFindingRoute(message)
        : this.currentRoute.generateNextMessage(
            message,
            this.userResponses,
            this.botResponses,
            this.context
          );
    reply += `\n > Note: \n > 1. Always tag me at ${botUserName} in the comment to get a reply \n > 2. Comment 'BOT_NHK' to reset the conversation anytime`;
    // this.userResponses.push(message);
    // this.botResponses.push(reply);
    return reply;
  }
  private tryFindingRoute(message: string) {
    const triggeredRoutes = [];
    for (const route of this.routes) {
      if (route.isTriggered(message)) {
        triggeredRoutes.push(route);
      }
    }
    if (triggeredRoutes.length === 0) {
      return (
        "**🧐 Sorry I dont understand, please keep in mind:**\n " +
        this.initMessage()
      );
    }
    if (triggeredRoutes.length > 1) {
      return (
        "**😵‍💫 I got a little confused there, please make sure:**\n " +
        this.initMessage()
      );
    }
    this.currentRoute = triggeredRoutes[0];
    return this.currentRoute.generateNextMessage(
      message,
      this.userResponses,
      this.botResponses,
      this.context
    );
  }
}
