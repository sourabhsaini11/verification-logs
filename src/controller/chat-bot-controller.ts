import chalk from "chalk";
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
    userResponses: string[] = [],
    botResponses: string[] = []
  ) {
    this.InitBot();
    this.userResponses = userResponses;
    this.botResponses = botResponses;
    this.context = requirements;
    // this.currentRoute = this.loadRoute(botResponses);
    this.currentRoute = this.routes[0];
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
  public async replyToUser(message: string) {
    let reply = "";
    if (this.userResponses.length <= 0 && this.currentRoute === undefined) {
      reply = this.initMessage();
    } else {
      reply =
        this.currentRoute === undefined
          ? await this.tryFindingRoute(message)
          : await this.generateRouteMessage(
              message,
              this.userResponses,
              this.botResponses,
              this.context,
              this.currentRoute
            );
    }
    console.log(chalk.bgYellowBright(reply));
    const meta =
      reply.split("$$").length > 1 ? reply.split("$$")[1] : undefined;
    reply = reply.split("$$")[0];
    reply += `\n > Note: \n > 1. Always tag me at ${botUserName} in the comment to get a reply \n > 2. Close and reopen the PR to reset the conversation`;
    reply += meta ? `$$ ${meta}` : "";
    return reply;
  }
  private async generateRouteMessage(
    latestMessage: string,
    userResponses: string[],
    botResponses: string[],
    context: PrChatBotRequiments,
    route: ConversationRoute
  ) {
    const reply = await route.generateNextMessage(
      latestMessage,
      userResponses,
      botResponses,
      context
    );
    return `> ~${route.saveWord()} \n\n ${reply}`; // saving data in the comments for future reference
  }
  private async tryFindingRoute(message: string) {
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
    return this.generateRouteMessage(
      message,
      this.userResponses,
      this.botResponses,
      this.context,
      this.currentRoute
    );
  }
  // private loadRoute(botMessages: string[]) {
  //   let loadedroute = undefined;
  //   for (const message of botMessages) {
  //     for (const route of this.routes) {
  //       if (message.includes(`~${route.saveWord()}`)) {
  //         console.log("Loading route", route.saveWord());
  //         loadedroute = route;
  //         break;
  //       }
  //       if (loadedroute !== undefined) {
  //         break;
  //       }
  //     }
  //   }
  // return loadedroute;
  // }
}
