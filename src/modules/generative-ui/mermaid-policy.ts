const MAX_MERMAID_SOURCE_LENGTH = 20 * 1024;
const SUPPORTED_DIAGRAM =
	/^(?:flowchart(?:\s+(?:TB|BT|RL|LR|TD))?|sequenceDiagram|stateDiagram-v2|classDiagram|erDiagram)(?:\s|$)/;
const PRESENTATION_DIRECTIVE = /^\s*(?:style|classDef|linkStyle)\b/i;

export type MermaidSourceValidation =
	| { ok: true; source: string }
	| { ok: false; reason: string };

export function validateMermaidSource(source: string): MermaidSourceValidation {
	if (source.length > MAX_MERMAID_SOURCE_LENGTH) {
		return { ok: false, reason: "Diagram source exceeds 20 KiB." };
	}

	const normalizedSource = source
		.replace(/<br\s*\/?>/gi, " ")
		.split(/\r?\n/)
		.filter((line) => !PRESENTATION_DIRECTIVE.test(line))
		.join("\n")
		.trim();

	if (/%%\s*\{/i.test(normalizedSource)) {
		return { ok: false, reason: "Mermaid init directives are not allowed." };
	}
	if (/```/.test(normalizedSource)) {
		return { ok: false, reason: "Mermaid code fences are not allowed." };
	}
	if (
		/^\s*click\b/im.test(normalizedSource) ||
		/^\s*callback\b/im.test(normalizedSource)
	) {
		return { ok: false, reason: "Mermaid callbacks are not allowed." };
	}
	if (/(?:https?|mailto|javascript|data):|\bhref\b/i.test(normalizedSource)) {
		return { ok: false, reason: "External Mermaid links are not allowed." };
	}
	if (/<\/?[a-z][^>]*>/i.test(normalizedSource)) {
		return { ok: false, reason: "HTML labels are not allowed in Mermaid." };
	}

	const firstStatement = normalizedSource
		.split(/\r?\n/)
		.map((line) => line.trim())
		.find((line) => line.length > 0 && !line.startsWith("%%"));

	if (!firstStatement || !SUPPORTED_DIAGRAM.test(firstStatement)) {
		return { ok: false, reason: "Unsupported Mermaid diagram type." };
	}

	return { ok: true, source: normalizedSource };
}
