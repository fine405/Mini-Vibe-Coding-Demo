/**
 * Fuzzy matching utility for file search
 */

export interface FuzzyMatchResult {
	matched: boolean;
	score: number;
	matchedIndices: number[];
}

/**
 * Performs fuzzy matching on a string
 * Returns a score based on how well the pattern matches
 * Higher score = better match
 */
export function fuzzyMatch(pattern: string, text: string): FuzzyMatchResult {
	if (!pattern) {
		return { matched: true, score: 0, matchedIndices: [] };
	}

	const patternLower = pattern.toLowerCase();
	const textLower = text.toLowerCase();
	const matchedIndices: number[] = [];

	let patternIndex = 0;
	let textIndex = 0;
	let score = 0;
	let consecutiveMatches = 0;

	while (patternIndex < patternLower.length && textIndex < textLower.length) {
		const patternChar = patternLower[patternIndex];
		const textChar = textLower[textIndex];

		if (patternChar === textChar) {
			matchedIndices.push(textIndex);

			// Bonus for consecutive matches
			consecutiveMatches++;
			score += 10 + consecutiveMatches * 5;

			// Bonus for matching at word boundaries
			if (
				textIndex === 0 ||
				text[textIndex - 1] === "/" ||
				text[textIndex - 1] === "."
			) {
				score += 20;
			}

			// Bonus for exact case match
			if (pattern[patternIndex] === text[textIndex]) {
				score += 5;
			}

			patternIndex++;
		} else {
			consecutiveMatches = 0;

			// Penalty for gaps
			score -= 1;
		}

		textIndex++;
	}

	// Check if all pattern characters were matched
	const matched = patternIndex === patternLower.length;

	// Penalty for length difference
	if (matched) {
		const lengthDiff = text.length - pattern.length;
		score -= lengthDiff * 0.5;
	}

	return {
		matched,
		score: matched ? score : -1,
		matchedIndices,
	};
}

/**
 * Filters and sorts items by fuzzy match score
 */
export function fuzzyFilter<T>(
	items: T[],
	pattern: string,
	getText: (item: T) => string,
): T[] {
	if (!pattern) {
		return items;
	}

	const matches = items
		.map((item) => {
			const text = getText(item);
			const result = fuzzyMatch(pattern, text);
			return { item, result };
		})
		.filter(({ result }) => result.matched)
		.sort((a, b) => b.result.score - a.result.score);

	return matches.map(({ item }) => item);
}
