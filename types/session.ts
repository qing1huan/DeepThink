/**
 * Session data model for DeepThink v4.3
 * Multi-session architecture with independent canvases
 */

import { ThreadNode } from "./canvas";
import { Message, generateMessageId } from "./chat";

/**
 * A Session represents an independent canvas/conversation sandbox
 * Each session has its own thread tree that is isolated from other sessions
 */
export interface Session {
    /** Unique identifier for the session */
    id: string;
    /** Session title (usually derived from first user message or root thread) */
    title: string;
    /** Creation timestamp */
    createdAt: number;
    /** Last activity timestamp */
    updatedAt: number;
    /** All threads in this session (isolated from other sessions) */
    threads: Map<string, ThreadNode>;
    /** Currently active thread within this session */
    activeThreadId: string;
    /** Canvas viewport state for restoration */
    viewport?: {
        x: number;
        y: number;
        zoom: number;
    };
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a welcome thread for a new session
 */
function createSessionWelcomeThread(): ThreadNode {
    const threadId = `thread_main_${Date.now()}`;
    const welcomeMessage: Message = {
        id: generateMessageId(),
        role: "assistant",
        content: "Welcome to **DeepThink Canvas**! 🎨\n\nThis is your main conversation thread. Type a message below to start chatting. You can branch from any of my responses to explore different conversation paths.\n\n**Features:**\n- 📝 Markdown rendering with **bold**, *italic*, and `code`\n- 💻 Syntax-highlighted code blocks\n- 📐 LaTeX math: $E = mc^2$\n- 🌿 Branch conversations to explore alternatives",
        thoughts: "User has just opened the Canvas. I should provide a welcoming message that explains the branching feature and showcases the Markdown capabilities.",
        timestamp: Date.now(),
    };

    return {
        id: threadId,
        messages: [welcomeMessage],
        parentId: null,
        parentMessageId: null,
        title: "Main Thread",
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
}

/**
 * Create a new empty session with a welcome thread
 */
export function createDefaultSession(title?: string): Session {
    const id = generateSessionId();
    const welcomeThread = createSessionWelcomeThread();
    const now = Date.now();

    return {
        id,
        title: title || "New Conversation",
        createdAt: now,
        updatedAt: now,
        threads: new Map([[welcomeThread.id, welcomeThread]]),
        activeThreadId: welcomeThread.id,
    };
}

/**
 * Generate a title for a session based on its first user message
 */
export function generateSessionTitle(session: Session): string {
    // Find the first user message across all threads
    for (const thread of session.threads.values()) {
        const firstUserMessage = thread.messages.find(m => m.role === "user");
        if (firstUserMessage) {
            const title = firstUserMessage.content.substring(0, 50);
            return title.length < firstUserMessage.content.length
                ? `${title}...`
                : title;
        }
    }
    return session.title;
}

/**
 * Serializable session format for storage
 */
export interface SerializedSession {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    threads: [string, ThreadNode][];
    activeThreadId: string;
    viewport?: { x: number; y: number; zoom: number };
}

/**
 * Serialize a session for storage
 */
export function serializeSession(session: Session): SerializedSession {
    return {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        threads: Array.from(session.threads.entries()),
        activeThreadId: session.activeThreadId,
        viewport: session.viewport,
    };
}

/**
 * Deserialize a session from storage
 */
export function deserializeSession(data: SerializedSession): Session {
    return {
        id: data.id,
        title: data.title,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        threads: new Map(data.threads),
        activeThreadId: data.activeThreadId,
        viewport: data.viewport,
    };
}
