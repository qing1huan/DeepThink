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
        content: "欢迎使用 **DeepThink 画布**！🎨\n\n这是您的主会话。在下方输入消息即可开始聊天。您可以从我的任意回复中创建分支，探索不同的对话路径。\n\n**功能特性：**\n- 📝 支持 Markdown 渲染（加粗、斜体等）\n- 💻 代码块语法高亮\n- 📐 LaTeX 数学公式支持\n- 🌿 支持创建分支对话以探索不同思路",
        thoughts: "用户刚刚打开了画布，我应该提供一条欢迎消息，介绍分支功能并展示 Markdown 功能。",
        timestamp: Date.now(),
    };

    return {
        id: threadId,
        messages: [welcomeMessage],
        parentId: null,
        parentMessageId: null,
        title: "主会话",
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
        title: title || "新对话",
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
