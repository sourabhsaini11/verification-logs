import { PrChatBotRequiments } from "../../types/interface.js";

export abstract class ConversationRoute {
  abstract routeTrigger(): string; // to get help with log verification comment "verify logs"
  abstract saveWord(): string; //
  abstract generateNextMessage(
    latestMessage: string,
    userResponses: string[],
    botResponses: string[],
    context: PrChatBotRequiments
  ): Promise<string>;
  abstract isTriggered(latestMessage: string): boolean;
}
