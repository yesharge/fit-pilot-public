import type { AIMessage, AIRequestOptions } from "@/types/ai";

export interface AIProvider {
    name: string
    // Build and send the HTTP request. Returns the raw streaming Response.
    // The provider owns the URL, auth headers, and request body shape.
    defaultModel: string,
    call(
        systemPrompt: string, 
        messages: AIMessage[], 
        options: AIRequestOptions,
    ): Promise<Response>
    // Extract token text from a single SSE `data:` payload (already stripped
    // of the "data: " prefix). Returns null for events that carry no text
    // (e.g. message_start, ping, [DONE]). This is the ONLY method where
    // Anthropic and OpenAI diverge.
    parseStreamChunk(chunk: string): string | null;
}