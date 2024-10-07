import { Probot } from "probot";

export default (app: Probot) => {
  app.on("issues.opened", async (context) => {
    const issueComment = context.issue({
      body: "Thanks for opening this issue!ß",
    });
    await context.octokit.issues.createComment(issueComment);
  });

  app.on("pull_request.opened", async (context) => {
    const prComment = context.issue({
      body: "Thanks for opening this PR!",
    });
    await context.octokit.issues.createComment(prComment);
  });
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
