import { Probot } from "probot";

export default (app: Probot) => {
  // app.on("issues.opened", async (context) => {
  //   const issueComment = context.issue({
  //     body: "Thanks for opening this issue!ß",
  //   });
  //   await context.octokit.issues.createComment(issueComment);
  // });

  app.on(["pull_request.opened", "pull_request.reopened"], async (context) => {
    const prComment = context.issue({
      body: "Thanks for opening this PR!",
    });
    await context.octokit.issues.createComment(prComment);
  });

  app.on("issue_comment.created", async (context) => {
    if (context.isBot) {
      return; // Ignore comments created by bots
    }

    // Get the comment body and print it
    const newComment = context.payload.comment.body;
    console.log(`New Comment: ${newComment}`);

    // Check if the comment is on a pull request (since PRs are treated as issues in GitHub's API)
    const issueNumber = context.payload.issue.number;
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;

    // Fetch all comments on the pull request/issue
    const { data: comments } = await context.octokit.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
    });

    // Print all comments on the PR/issue
    comments.forEach((comment) => {
      console.log(`Comment by ${comment.user?.type}: ${comment.body}`);
    });
  });
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
