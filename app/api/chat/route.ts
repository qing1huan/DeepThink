import { NextRequest } from "next/server";

// API Configuration - uses environment variables for flexibility
const API_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const MODEL_NAME = process.env.DEEPSEEK_MODEL || "deepseek-reasoner"; // DeepSeek R1 with Chain of Thought

export const runtime = "edge";

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
}

interface OpenAIStreamDelta {
    role?: string;
    content?: string;
    reasoning_content?: string; // DeepSeek R1 specific field
}

interface OpenAIStreamChoice {
    index: number;
    delta: OpenAIStreamDelta;
    finish_reason: string | null;
}

interface OpenAIStreamChunk {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: OpenAIStreamChoice[];
}

export async function POST(request: NextRequest) {
    try {
        const { messages } = await request.json();

        if (!messages || !Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: "Messages array is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "DEEPSEEK_API_KEY not configured" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        // Build the API URL - ensure we hit the chat completions endpoint
        const apiUrl = `${API_BASE_URL.replace(/\/$/, "")}/chat/completions`;

        console.log(`Calling API: ${apiUrl} with model: ${MODEL_NAME}`);

        // Call OpenAI-compatible API with streaming
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: messages.map((m: Message) => ({
                    role: m.role,
                    content: m.content,
                })),
                stream: true,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("API error:", response.status, errorText);
            return new Response(
                JSON.stringify({ error: `API error: ${response.status} - ${errorText}` }),
                { status: response.status, headers: { "Content-Type": "application/json" } }
            );
        }

        // Create a transform stream to process the SSE response
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        // Track state for DeepSeek R1 reasoning_content handling
        let isInReasoningPhase = false;
        let hasStartedContent = false;
        let buffer = ""; // Buffer for incomplete SSE lines

        const transformStream = new TransformStream({
            async transform(chunk, controller) {
                const text = decoder.decode(chunk, { stream: true });
                buffer += text;

                // Process complete lines only
                const lines = buffer.split("\n");
                // Keep the last potentially incomplete line in the buffer
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;

                    const data = trimmedLine.slice(6).trim();
                    if (data === "[DONE]") {
                        // Close the thinking tag if we were in reasoning phase
                        if (isInReasoningPhase && !hasStartedContent) {
                            controller.enqueue(encoder.encode("</think>\n\n"));
                        }
                        continue;
                    }

                    try {
                        const parsed: OpenAIStreamChunk = JSON.parse(data);
                        const choice = parsed.choices?.[0];

                        if (!choice) continue;

                        const delta = choice.delta;

                        // Handle reasoning_content (DeepSeek R1 Chain of Thought)
                        if (delta.reasoning_content) {
                            if (!isInReasoningPhase) {
                                // Start the think tag
                                controller.enqueue(encoder.encode("<think>\n"));
                                isInReasoningPhase = true;
                            }
                            controller.enqueue(encoder.encode(delta.reasoning_content));
                        }

                        // Handle main content (works for both DeepSeek R1 and standard OpenAI)
                        if (delta.content) {
                            if (isInReasoningPhase && !hasStartedContent) {
                                // Close the think tag before starting content
                                controller.enqueue(encoder.encode("\n</think>\n\n"));
                                hasStartedContent = true;
                            }
                            controller.enqueue(encoder.encode(delta.content));
                        }

                        // Check for finish
                        if (choice.finish_reason) {
                            if (isInReasoningPhase && !hasStartedContent) {
                                controller.enqueue(encoder.encode("\n</think>\n\n"));
                            }
                        }
                    } catch (e) {
                        // Skip malformed JSON chunks (common with SSE)
                        // Don't log every parse error as it can be noisy
                    }
                }
            },
            flush(controller) {
                // Handle any remaining buffer content
                if (buffer.trim()) {
                    const trimmedLine = buffer.trim();
                    if (trimmedLine.startsWith("data: ")) {
                        const data = trimmedLine.slice(6).trim();
                        if (data !== "[DONE]") {
                            try {
                                const parsed: OpenAIStreamChunk = JSON.parse(data);
                                const choice = parsed.choices?.[0];
                                if (choice?.delta?.content) {
                                    controller.enqueue(encoder.encode(choice.delta.content));
                                }
                            } catch (e) {
                                // Ignore parse errors in flush
                            }
                        }
                    }
                }
                // Ensure we close any open think tags
                if (isInReasoningPhase && !hasStartedContent) {
                    controller.enqueue(encoder.encode("\n</think>\n\n"));
                }
            }
        });

        // Pipe the response through our transform stream
        if (!response.body) {
            return new Response(
                JSON.stringify({ error: "No response body from API" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const outputStream = response.body.pipeThrough(transformStream);

        return new Response(outputStream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (error) {
        console.error("Chat API error:", error);
        return new Response(
            JSON.stringify({ error: `Internal server error: ${error}` }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
