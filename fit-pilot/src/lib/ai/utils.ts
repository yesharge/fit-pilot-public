/**
 * Rough estimate of the number of tokens in a given text — ~4 characters per token.
 * Not a substitute for a real tokenizer when precision matters.
 * @param text - The text to estimate the tokens for.
 * @returns The estimated number of tokens.
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}