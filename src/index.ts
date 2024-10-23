import { Probot } from "probot";
import { checkBotTagged, extractJSONObject } from "./utils/general.js";
import { botUserName } from "./constants/index.js";
import { IssueComment } from "./types/interface.js";
// import { labelPr } from "./utils/gitUtil.js";
// import { generateFinalMessage } from "./services/gistService.js";
import { ChatBotController } from "./controller/chat-bot-controller.js";
import chalk from "chalk";
import { getFilteredComments } from "./utils/probotUtils.js";

export default (app: Probot) => {
  app.on(["pull_request.opened", "pull_request.reopened"], async (context) => {
    const chat = new ChatBotController(
      {
        changedFiles: [],
        forkBranch: "master",
        forkOwnerId: "",
        forkRepoName: "",
        issueNumber: 0,
        context: context,
      },
      [],
      []
    );
    const prComment = context.issue({
      body: await chat.replyToUser(""),
    });
    await context.octokit.issues.createComment(prComment);
    const prDetails = await context.octokit.pulls.get(
      context.repo({ pull_number: context.payload.pull_request.number })
    );
    const rep = context.repo();
    await context.octokit.repos.createCommitStatus({
      ...rep,
      sha: prDetails.data.head.sha,
      state: "pending", // This marks the status as failed
      context: "ondc-bot-validations",
      description: "waiting for user to initiate the validation",
    });
  });
  app.on("issue_comment.created", async (context) => {
    if (context.isBot) {
      return;
    }
    const newComment = context.payload.comment.body;
    if (!checkBotTagged(newComment)) {
      return;
    }
    if (context.payload.issue.pull_request == undefined) {
      return;
    }

    const issueNumber = context.payload.issue.number;
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;
    const prDetails = await context.octokit.pulls.get(
      context.repo({ pull_number: context.payload.issue.number })
    );
    const forkOwner = prDetails.data.head.repo?.owner.login; // Fork owner's GitHub username
    const forkRepoName = prDetails.data.head.repo?.full_name; // Full name of the forked repository
    const forkBranch = prDetails.data.head.ref; // Branch name of the forked repo
    const changedFiles = await context.octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: issueNumber,
    });
    const comments = await getFilteredComments(
      context,
      owner,
      repo,
      prDetails,
      issueNumber
    );
    const prevComments: IssueComment[] = comments.map((c: any) => {
      return { comment: c.body ?? "", type: c.user?.type || "" };
    });

    console.log(
      chalk.blueBright("prevComments", JSON.stringify(prevComments, null, 2))
    );
    const botComments = prevComments
      .filter((c) => c.type === "Bot")
      .map((c) => c.comment);
    const userComments = prevComments
      .filter((c) => c.type === "User")
      .filter((c) => c.comment.includes(botUserName))
      .map((c) => c.comment);
    console.log(`
        changedFiles: ${changedFiles.data.map((file) => file.filename)}
        forkBranch: ${forkBranch}
        forkOwnerId: ${forkOwner}
        forkRepoName: ${forkRepoName}
        issueNumber: ${issueNumber}
        `);
    const chatBot = new ChatBotController(
      {
        changedFiles: changedFiles.data.map((file) => file.filename),
        forkBranch: forkBranch,
        forkOwnerId: forkOwner ?? owner,
        forkRepoName: forkRepoName ?? repo,
        issueNumber: issueNumber,
        context: context,
      },
      userComments ?? [],
      botComments ?? []
    );
    const response = await chatBot.replyToUser(newComment);
    console.log(chalk.magentaBright("response", response));
    const responseMessage = response.split("$$")[0];
    let meta =
      response.split("$$").length > 1 ? response.split("$$")[1] : undefined;
    const prComment = context.issue({
      body: responseMessage,
    });
    if (meta) {
      const rep = context.repo();
      const jsonData = extractJSONObject(meta);
      const status = jsonData?.commitSatus;
      const description = jsonData?.description;
      await context.octokit.repos.createCommitStatus({
        ...rep,
        sha: prDetails.data.head.sha,
        state: status, // This marks the status as failed
        context: "ondc-bot-validations",
        description: description,
      });
    } else {
      const rep = context.repo();
      await context.octokit.repos.createCommitStatus({
        ...rep,
        sha: prDetails.data.head.sha,
        state: "pending", // This marks the status as failed
        context: "ondc-bot-validations",
        description: "waiting for user to initiate the validation",
      });
    }

    await context.octokit.issues.createComment(prComment);
  });
};
