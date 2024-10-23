import { Probot } from "probot";
import { checkBotTagged, extractJSONObject } from "./utils/general.js";
import { botUserName } from "./constants/index.js";
import { IssueComment } from "./types/interface.js";
// import { labelPr } from "./utils/gitUtil.js";
// import { generateFinalMessage } from "./services/gistService.js";
import { ChatBotController } from "./controller/chat-bot-controller.js";
import chalk from "chalk";

export default (app: Probot) => {
  app.on(
    [
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.synchronize",
    ],
    async (context) => {
      const prComment = context.issue({
        body: `Hello, Please tag me at ${botUserName} in a comment to verify the logs. `,
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
    }
  );
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

    console.log(chalk.blueBright("prevComments", prevComments));
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
    // console.log("response", response);
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

// Get the comments after PR reopened or new commits were pushed
async function getFilteredComments(
  context: any,
  owner: string,
  repo: string,
  prDetails: any,
  issueNumber: number
) {
  // Get all comments for the PR
  const { data: comments } = await context.octokit.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
  });

  // Get PR events (reopened, synchronize)
  const { data: events } = await context.octokit.issues.listEvents({
    owner,
    repo,
    issue_number: issueNumber,
  });

  // Track the most recent 'reopened' or 'synchronize' event
  let latestEventTime = new Date(prDetails.data.created_at); // Start with PR creation time

  for (const event of events) {
    if (event.event === "reopened" || event.event === "synchronize") {
      console.log(event.event, event.created_at);
      const eventTime = new Date(event.created_at);
      if (eventTime > latestEventTime) {
        latestEventTime = eventTime; // Update to the latest event time
      }
    }
  }
  // Filter comments made after the latest 'reopened' or 'synchronize' event
  const filteredComments = comments.filter((comment: any) => {
    const commentTime = new Date(comment.created_at);
    console.log(chalk.redBright(commentTime, latestEventTime), comment.body);
    return commentTime > latestEventTime;
  });

  return filteredComments;
}
