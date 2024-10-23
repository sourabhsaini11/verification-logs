import chalk from "chalk";

// Get the comments after PR reopened or new commits were pushed
export async function getFilteredComments(
  context: any,
  owner: string,
  repo: string,
  prDetails: any,
  issueNumber: number
) {
  // Get all comments for the PR
  const comments = await getAllComments(context, owner, repo, issueNumber);

  // Get PR events (reopened, synchronize)
  const { data: events } = await context.octokit.issues.listEvents({
    owner,
    repo,
    issue_number: issueNumber,
  });

  // Track the most recent 'reopened' or 'synchronize' event
  let latestEventTime = new Date(prDetails.data.created_at); // Start with PR creation time

  for (const event of events) {
    console.log(event.event);
    if (event.event === "reopened" || event.event === "synchronize") {
      console.log(event.event, event.created_at);
      const eventTime = new Date(event.created_at);
      if (eventTime > latestEventTime) {
        latestEventTime = eventTime; // Update to the latest event time
      }
    }
  }
  // Sort comments by 'created_at' timestamp
  const sortedComments = comments.sort((a: any, b: any) => {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); // Ascending order
  });

  // Filter comments made after the latest 'reopened' or 'synchronize' event
  const filteredComments = sortedComments.filter((comment: any) => {
    const commentTime = new Date(comment.created_at);
    console.log(chalk.redBright(commentTime, latestEventTime), comment.body);
    return commentTime > latestEventTime;
  });

  return filteredComments;
}

async function getAllComments(
  context: any,
  owner: string,
  repo: string,
  issueNumber: number
) {
  let allComments: any[] = [];
  let page = 1;
  const perPage = 100; // Maximum allowed per page

  while (true) {
    const { data: comments } = await context.octokit.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
      per_page: perPage,
      page: page,
    });

    // Add the fetched comments to the allComments array
    allComments = [...allComments, ...comments];

    // If less than perPage comments are returned, it means we have fetched all comments
    if (comments.length < perPage) {
      break;
    }

    // Otherwise, increment the page number to fetch the next set of comments
    page++;
  }

  return allComments;
}
