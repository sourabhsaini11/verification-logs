export interface PrDataExcel {
	prCreator: string;
	filePaths?: string[];
	labels?: string[];
	npName: string;
	domain?: string;
	comment?: string;
}

export async function createRow(data: PrDataExcel) {
	console.log("Creating Row", data);
}

export async function updateRow(data: PrDataExcel) {
	console.log("Updating Row", data);
}
