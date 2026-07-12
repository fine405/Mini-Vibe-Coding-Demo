import { z } from "zod";

export const WORKSPACE_PROTOCOL_VERSION = 1 as const;
const contentHashSchema = z.string().regex(/^fnv1a64:[0-9a-f]{16}$/);

export const workspaceSnapshotFileSchema = z.object({
	content: z.string(),
	hash: contentHashSchema,
});

export const workspaceSnapshotV1Schema = z.object({
	revision: contentHashSchema,
	files: z.record(workspaceSnapshotFileSchema),
});
export const workspaceSnapshotSchema = workspaceSnapshotV1Schema;

export const workspaceChangeSchema = z.discriminatedUnion("op", [
	z.object({
		op: z.literal("create"),
		path: z.string(),
		beforeHash: z.null(),
		content: z.string(),
	}),
	z.object({
		op: z.literal("update"),
		path: z.string(),
		beforeHash: contentHashSchema,
		content: z.string(),
	}),
	z.object({
		op: z.literal("delete"),
		path: z.string(),
		beforeHash: contentHashSchema,
	}),
]);

export const workspaceChangeSetV1Schema = z.object({
	id: z.string().min(1),
	baseRevision: contentHashSchema,
	summary: z.string().min(1).max(500),
	changes: z.array(workspaceChangeSchema),
});
export const workspaceChangeSetSchema = workspaceChangeSetV1Schema;

export const changeSelectionV1Schema = z
	.object({
		changeIndices: z.array(z.number().int().nonnegative()).optional(),
		hunkIndicesByChange: z
			.record(z.array(z.number().int().nonnegative()))
			.optional(),
	})
	.refine(
		(selection) => !(selection.changeIndices && selection.hunkIndicesByChange),
		{ message: "Choose either file changes or hunks, not both" },
	);

export const workspaceConflictV1Schema = z.object({
	ok: z.literal(false),
	code: z.enum([
		"STALE_REVISION",
		"INVALID_CHANGESET",
		"PATH_CONFLICT",
		"HASH_CONFLICT",
	]),
	message: z.string(),
	failedPaths: z.array(z.string()),
});

export const preparedWorkspaceTransactionV1Schema = z.object({
	files: z.record(z.string()),
	previousRevision: contentHashSchema,
	revision: contentHashSchema,
	affectedPaths: z.array(z.string()),
	inverse: workspaceChangeSetV1Schema,
});
