import "@tanstack/react-start/server-only";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { workspaceChangeSetSchema } from "@/modules/workspace/schema";
import { researchTools } from "@/server/agent/research-tools";
import { RunWorkspace } from "@/server/agent/run-workspace";

function getRunWorkspace(context: {
	requestContext?: { get(key: string): unknown };
}): RunWorkspace {
	const workspace = context.requestContext?.get("runWorkspace");
	if (!(workspace instanceof RunWorkspace)) {
		throw new Error("Run workspace is missing from request context");
	}
	return workspace;
}

const fileSummarySchema = z.object({
	path: z.string(),
	hash: z.string(),
	bytes: z.number().int().nonnegative(),
});

export const listFilesTool = createTool({
	id: "list_files",
	description:
		"List normalized workspace file paths. Optionally filter paths by a case-insensitive substring.",
	inputSchema: z.object({ query: z.string().max(200).optional() }),
	outputSchema: z.object({ files: z.array(fileSummarySchema) }),
	mcp: {
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	execute: async ({ query }, context) => ({
		files: getRunWorkspace(context).listFiles(query),
	}),
});

export const readFileTool = createTool({
	id: "read_file",
	description:
		"Read a text file from the isolated workspace. Existing files must be read before mutation.",
	inputSchema: z.object({ path: z.string() }),
	outputSchema: z.object({
		path: z.string(),
		content: z.string(),
		hash: z.string(),
	}),
	mcp: {
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	execute: async ({ path }, context) => getRunWorkspace(context).readFile(path),
});

export const searchFilesTool = createTool({
	id: "search_files",
	description:
		"Search text across workspace files and return bounded line matches. Matching files count as inspected.",
	inputSchema: z.object({
		query: z.string().min(1).max(200),
		useRegex: z.boolean().default(false),
	}),
	outputSchema: z.object({
		matches: z.array(
			z.object({
				path: z.string(),
				line: z.number().int().positive(),
				text: z.string(),
			}),
		),
	}),
	mcp: {
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	execute: async ({ query, useRegex }, context) => ({
		matches: getRunWorkspace(context).searchFiles(
			query,
			useRegex,
			context.abortSignal,
		),
	}),
});

export const writeFileTool = createTool({
	id: "write_file",
	description:
		"Create or fully replace one text file in the isolated workspace. Read an existing file first.",
	inputSchema: z.object({ path: z.string(), content: z.string() }),
	outputSchema: fileSummarySchema,
	mcp: {
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	execute: async ({ path, content }, context) => {
		const result = getRunWorkspace(context).writeFile(path, content);
		return {
			path: result.path,
			hash: result.hash,
			bytes: new TextEncoder().encode(result.content).byteLength,
		};
	},
});

export const deleteFileTool = createTool({
	id: "delete_file",
	description:
		"Delete one previously inspected file from the isolated workspace.",
	inputSchema: z.object({ path: z.string() }),
	outputSchema: z.object({ path: z.string(), deleted: z.literal(true) }),
	mcp: {
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	execute: async ({ path }, context) =>
		getRunWorkspace(context).deleteFile(path),
});

export const finalizeChangesTool = createTool({
	id: "finalize_changes",
	description:
		"Finalize the shadow workspace into a structured ChangeSet for human review. Call exactly once, after all edits.",
	inputSchema: z.object({ summary: z.string().min(1).max(500) }),
	outputSchema: workspaceChangeSetSchema,
	mcp: {
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	execute: async ({ summary }, context) =>
		getRunWorkspace(context).finalize(summary),
});

export const codingTools = {
	list_files: listFilesTool,
	read_file: readFileTool,
	search_files: searchFilesTool,
	write_file: writeFileTool,
	delete_file: deleteFileTool,
	finalize_changes: finalizeChangesTool,
	...researchTools,
};
