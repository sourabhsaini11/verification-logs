import { Context, Probot } from "probot";
import {
	createRow,
	PrDataExcel,
	updateRow,
} from "./services/excel-service/excel.js";

export const knownDomainFolders = ["FIS14"];

export default (app: Probot) => {
	const processPullRequest = async (
		context: Context<"pull_request.opened" | "pull_request.synchronize">,
		action: "create" | "update"
	) => {
		const owner = context.payload.repository.owner.login;
		const repo = context.payload.repository.name;
		const prNumber = context.payload.number;

		// Get changed files
		const changedFiles = await context.octokit.pulls.listFiles({
			owner,
			repo,
			pull_number: prNumber,
		});
		const names = changedFiles.data.map((file: any) => file.filename);
		console.log(`changedFiles: ${names}`);

		// Validate file paths
		const validPr = validateFilePaths(names);
		if (!validPr.valid) {
			const prComment = context.issue({
				body: validPr.message,
			});
			await context.octokit.issues.createComment(prComment);
			return false; // Indicates validation failure
		}

		// Extract PR details
		const prCreator = context.payload.pull_request.user.login;
		const labels = context.payload.pull_request.labels.map(
			(label: any) => label.name
		);
		const data: PrDataExcel = {
			prCreator: prCreator,
			filePaths: names,
			labels: labels,
			npName: names[0].split("/")[1],
			domain: names[0].split("/")[0],
		};

		// Perform action: create or update
		if (action === "create") {
			await createRow(data);
		} else if (action === "update") {
			await updateRow(data);
		}
		return true;
	};

	app.on("pull_request.opened", async (context) => {
		console.log("pull_request.opened");
		await processPullRequest(context, "create");
	});
	app.on("pull_request.synchronize", async (context) => {
		console.log("pull_request.synchronize");
		await processPullRequest(context, "update");
	});

	app.on("issue_comment.created", async (context) => {
		if (context.payload.issue.pull_request == undefined) {
			return;
		}
		const newComment = context.payload.comment.body;
		const issueNumber = context.payload.issue.number;
		const owner = context.payload.repository.owner.login;
		const repo = context.payload.repository.name;

		const changedFiles = await context.octokit.pulls.listFiles({
			owner,
			repo,
			pull_number: issueNumber,
		});
		const names = changedFiles.data.map((file: any) => file.filename);
		console.log(`changedFiles: ${names}`);

		// Validate file paths
		const validPr = validateFilePaths(names);
		if (!validPr.valid) {
			const prComment = context.issue({
				body: validPr.message,
			});
			await context.octokit.issues.createComment(prComment);
			return false; // Indicates validation failure
		}

		const data: PrDataExcel = {
			comment: newComment,
			prCreator: owner,
			npName: names[0].split("/")[1],
			domain: names[0].split("/")[0],
		};
		await createRow(data);
		return true;
	});
};

function validateFilePaths(filePaths: string[]) {
	for (const path of filePaths) {
		const pathArray = path.split("/");
		if (pathArray.length < 2) {
			return {
				valid: false,
				message: `The path ${path} is invalid. It should be in the format <DOMAIN>/<NP-NAME>/*. and the <DOMAIN> should be one of ${knownDomainFolders.join(
					", "
				)}`,
			};
		}
	}
	const npNames = filePaths.map((path) => path.split("/")[1]);
	const npName = npNames[0];
	if (!npNames.every((name) => name === npName)) {
		return {
			valid: false,
			message: `Please raise the Pr under single Np folder, as found ${npNames.join(
				", "
			)} in the changed file paths`,
		};
	}
	const domain = filePaths[0].split("/")[0];
	if (!knownDomainFolders.includes(domain)) {
		return {
			valid: false,
			message: `The domain ${domain} is not a known domain in one of your file changes path. The known domains are ${knownDomainFolders.join(
				", "
			)}`,
		};
	}
	return {
		valid: true,
		message: "",
	};
}
