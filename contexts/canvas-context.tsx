"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { Node, Edge } from "reactflow";
import { Message, parseR1Response, generateMessageId } from "@/types/chat";
import {
  ThreadNode,
  ThreadNodeData,
  generateThreadId,
} from "@/types/canvas";
import { buildFlowElements } from "@/lib/canvas-utils";
import {
  Session,
  createDefaultSession,
  serializeSession,
  deserializeSession,
  SerializedSession,
  generateSessionTitle,
} from "@/types/session";

// LocalStorage key - updated for multi-session
const STORAGE_KEY = "deepthink-canvas-v2";
const LEGACY_STORAGE_KEY = "deepthink-canvas-v1";

// Database API helpers
async function loadThreadsFromDB(): Promise<Map<string, ThreadNode>> {
  try {
    const response = await fetch("/api/threads");
    if (!response.ok) return new Map();

    const dbThreads = await response.json();
    const threadsMap = new Map<string, ThreadNode>();

    for (const dbThread of dbThreads) {
      const messages: Message[] = dbThread.messages?.map((m: { id: string; role: string; content: string; thoughts?: string; createdAt: string }) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        thoughts: m.thoughts || undefined,
        timestamp: new Date(m.createdAt).getTime(),
      })) || [];

      threadsMap.set(dbThread.id, {
        id: dbThread.id,
        messages,
        parentId: null,
        parentMessageId: null,
        title: dbThread.title || "Conversation",
        createdAt: new Date(dbThread.createdAt).getTime(),
        updatedAt: new Date(dbThread.updatedAt).getTime(),
      });
    }

    return threadsMap;
  } catch (error) {
    console.error("Failed to load threads from DB:", error);
    return new Map();
  }
}

async function createThreadInDB(title?: string): Promise<string | null> {
  try {
    const response = await fetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "New Conversation" }),
    });
    if (!response.ok) return null;
    const thread = await response.json();
    return thread.id;
  } catch (error) {
    console.error("Failed to create thread in DB:", error);
    return null;
  }
}

async function saveMessageToDB(
  threadId: string,
  role: "user" | "assistant",
  content: string,
  thoughts?: string
): Promise<boolean> {
  try {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, role, content, thoughts }),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to save message to DB:", error);
    return false;
  }
}

async function loadThreadMessagesFromDB(threadId: string): Promise<Message[]> {
  try {
    const response = await fetch(`/api/threads/${threadId}`);
    if (!response.ok) return [];

    const thread = await response.json();
    return thread.messages?.map((m: { id: string; role: string; content: string; thoughts?: string; createdAt: string }) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      thoughts: m.thoughts || undefined,
      timestamp: new Date(m.createdAt).getTime(),
    })) || [];
  } catch (error) {
    console.error("Failed to load thread messages:", error);
    return [];
  }
}

// Mock AI responses with DeepSeek R1 style thoughts
const MOCK_RESPONSES = [
  `<think>
The user is asking about the project status. Let me analyze...
Analysis: Phase 1 (Layout & Shell) is complete.
Phase 2 (Chat Engine) is now being implemented.
I should provide a clear, encouraging response.
</think>
Phase 1 is complete! The layout looks great with the collapsible sidebar and header navigation. We are now building the chat engine with R1 thought parsing. 🚀`,

  `<think>
User wants to understand how Chain of Thought works.
Key points to cover:
1. CoT makes AI reasoning transparent
2. DeepSeek R1 uses <think> tags
3. This helps with debugging and understanding
Let me structure a helpful response.
</think>
**Chain of Thought (CoT)** is a technique where AI models show their reasoning process before giving a final answer.

In DeepSeek R1, this is done using \`<think>\` tags. The model "thinks out loud" — analyzing the problem, considering options, and then providing a response. This makes AI decision-making more transparent and trustworthy!`,

  `<think>
Technical question about the architecture.
Components involved:
- parseR1Response() for regex extraction
- ThoughtProcess component for UI
- MessageBubble for display logic
I should explain the flow clearly.
</think>
The parsing works in 3 steps:

1. **Regex Extraction**: We use \`/<think>([\\s\\S]*?)<\\/think>/gi\` to find all thought blocks
2. **Content Separation**: The thoughts go to the \`thoughts\` field, everything else to \`content\`
3. **UI Rendering**: The \`ThoughtProcess\` component displays thoughts in a collapsible panel

This makes the AI's reasoning visible and toggleable! 💡`,

  `<think>
User is exploring the Canvas architecture.
Key points:
- Each node is a conversation thread
- Branching creates new exploration paths
- This enables non-linear dialogue exploration
</think>
Welcome to the **Canvas Chat** architecture! 

Each node you see represents a complete conversation thread. You can:
- **Continue** any thread by clicking on it
- **Branch** from any AI response to explore alternatives
- **Visualize** your entire conversation tree

This enables powerful non-linear exploration of ideas! 🌳`,

  `<think>
Let me demonstrate some Markdown and code capabilities.
I'll show:
- Code blocks with syntax highlighting
- Math formulas with LaTeX
- Lists and formatting
</think>
Here's a **code example** in JavaScript:

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 55
\`\`\`

And here's a math formula using LaTeX:

The quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

Or as a block equation:

$$E = mc^2$$

Pretty cool, right? 🎉`,
];

interface CanvasContextType {
  // Session management
  sessions: Session[];
  activeSessionId: string;
  currentSession: Session | null;

  // Current session state (derived)
  threads: Map<string, ThreadNode>;
  activeThreadId: string;
  nodes: Node<ThreadNodeData>[];
  edges: Edge[];
  isLoading: boolean;
  inputDraft: string;

  // Session actions
  createSession: () => void;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, title: string) => void;

  // Thread actions (within current session)
  setActiveThread: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  createBranch: (parentId: string, contextMessageId: string) => void;
  createBranchWithQuery: (
    parentId: string,
    contextMessageId: string,
    userQuery: string,
    selectedContext: string
  ) => Promise<void>;
  deleteThread: (id: string) => void;
  clearAllData: () => void;
  navigateToThread: (id: string) => void;
  getParentThread: (id: string) => ThreadNode | null;
  setInputDraft: (text: string) => void;
  clearInputDraft: () => void;
  stopGeneration: () => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvas must be used within CanvasProvider");
  }
  return context;
}

// Serialization helpers for multi-session storage
interface StoredStateV2 {
  sessions: SerializedSession[];
  activeSessionId: string;
  version: 2;
}

// Legacy format for migration
interface StoredStateV1 {
  threads: [string, ThreadNode][];
  activeThreadId: string;
  version?: number;
}

function serializeStateV2(sessions: Session[], activeSessionId: string): string {
  try {
    const state: StoredStateV2 = {
      sessions: sessions.map(serializeSession),
      activeSessionId,
      version: 2,
    };
    return JSON.stringify(state);
  } catch (error) {
    console.error("Failed to serialize state:", error);
    return "";
  }
}

function deserializeStateV2(json: string): { sessions: Session[]; activeSessionId: string } | null {
  try {
    if (!json || json.trim() === "") {
      return null;
    }

    const parsed = JSON.parse(json);

    // Check if it's v2 format
    if (parsed.version === 2 && Array.isArray(parsed.sessions)) {
      const sessions = parsed.sessions.map(deserializeSession);
      const activeSessionId = parsed.activeSessionId || sessions[0]?.id || "";
      return { sessions, activeSessionId };
    }

    return null;
  } catch (error) {
    console.error("Failed to deserialize v2 state:", error);
    return null;
  }
}

/**
 * Migrate legacy v1 format (flat threads) to v2 format (sessions)
 */
function migrateLegacyState(json: string): { sessions: Session[]; activeSessionId: string } | null {
  try {
    if (!json || json.trim() === "") {
      return null;
    }

    const state: StoredStateV1 = JSON.parse(json);

    // Validate legacy format
    if (!state || !Array.isArray(state.threads)) {
      return null;
    }

    // Convert threads to a session
    const validThreads: [string, ThreadNode][] = [];
    for (const [id, thread] of state.threads) {
      if (
        typeof id === "string" &&
        thread &&
        typeof thread.id === "string" &&
        Array.isArray(thread.messages)
      ) {
        validThreads.push([id, thread]);
      }
    }

    if (validThreads.length === 0) {
      return null;
    }

    const threadsMap = new Map(validThreads);

    // Create a session from the legacy data
    const now = Date.now();
    const legacySession: Session = {
      id: `session_migrated_${now}`,
      title: "Migrated Conversation",
      createdAt: now,
      updatedAt: now,
      threads: threadsMap,
      activeThreadId: state.activeThreadId || validThreads[0][0],
    };

    return {
      sessions: [legacySession],
      activeSessionId: legacySession.id,
    };
  } catch (error) {
    console.error("Failed to migrate legacy state:", error);
    return null;
  }
}

// Safe localStorage access (handles SSR and errors)
function safeGetItem(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  } catch (error) {
    console.error("Failed to read from localStorage:", error);
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    if (typeof window === "undefined") return false;
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error("Failed to write to localStorage:", error);
    return false;
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to remove from localStorage:", error);
  }
}

// Create initial welcome thread
function createWelcomeThread(): ThreadNode {
  const id = `thread_main_${Date.now()}`;
  const welcomeMessage: Message = {
    id: `msg_welcome_${Date.now()}`,
    role: "assistant",
    content: "Welcome to **DeepThink Canvas**! 🎨\n\nThis is your main conversation thread. Type a message below to start chatting. You can branch from any of my responses to explore different conversation paths.\n\n**Features:**\n- 📝 Markdown rendering with **bold**, *italic*, and `code`\n- 💻 Syntax-highlighted code blocks\n- 📐 LaTeX math: $E = mc^2$\n- 🌿 Branch conversations to explore alternatives",
    thoughts: "User has just opened the Canvas. I should provide a welcoming message that explains the branching feature and showcases the Markdown capabilities.",
    timestamp: Date.now(),
  };

  return {
    id,
    messages: [welcomeMessage],
    parentId: null,
    parentMessageId: null,
    title: "Main Thread",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// Create default state
function createDefaultState(): { threads: Map<string, ThreadNode>; activeThreadId: string } {
  const welcomeThread = createWelcomeThread();
  return {
    threads: new Map([[welcomeThread.id, welcomeThread]]),
    activeThreadId: welcomeThread.id,
  };
}

interface CanvasProviderProps {
  children: ReactNode;
  onNavigateToChat?: () => void;
}

export function CanvasProvider({ children, onNavigateToChat }: CanvasProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  // Multi-session state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [inputDraft, setInputDraftState] = useState<string>("");
  const mockIndexRef = useRef(0);
  const isInitializedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get current session (derived state)
  const currentSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId) || null;
  }, [sessions, activeSessionId]);

  // Get threads and activeThreadId from current session (derived for backward compatibility)
  const threads = useMemo(() => {
    return currentSession?.threads || new Map<string, ThreadNode>();
  }, [currentSession]);

  const activeThreadId = useMemo(() => {
    return currentSession?.activeThreadId || "";
  }, [currentSession]);

  // Helper to update current session
  const updateCurrentSession = useCallback((updater: (session: Session) => Session) => {
    setSessions(prev => prev.map(session =>
      session.id === activeSessionId ? updater(session) : session
    ));
  }, [activeSessionId]);

  // Helper to set threads in current session  
  const setThreads = useCallback((updater: Map<string, ThreadNode> | ((prev: Map<string, ThreadNode>) => Map<string, ThreadNode>)) => {
    updateCurrentSession(session => {
      const newThreads = typeof updater === "function"
        ? updater(session.threads)
        : updater;
      return {
        ...session,
        threads: newThreads,
        updatedAt: Date.now(),
      };
    });
  }, [updateCurrentSession]);

  // Helper to set active thread in current session
  const setActiveThreadIdInSession = useCallback((threadId: string) => {
    updateCurrentSession(session => ({
      ...session,
      activeThreadId: threadId,
    }));
  }, [updateCurrentSession]);

  // ==========================================
  // Session CRUD Operations
  // ==========================================

  const createSession = useCallback(() => {
    const newSession = createDefaultSession();
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    onNavigateToChat?.();
  }, [onNavigateToChat]);

  const switchSession = useCallback((sessionId: string) => {
    if (sessions.some(s => s.id === sessionId)) {
      setActiveSessionId(sessionId);
    }
  }, [sessions]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);

      // If we deleted the active session, switch to another
      if (sessionId === activeSessionId && updated.length > 0) {
        setActiveSessionId(updated[0].id);
      } else if (updated.length === 0) {
        // No sessions left, create a new one
        const defaultSession = createDefaultSession();
        setActiveSessionId(defaultSession.id);
        return [defaultSession];
      }

      return updated;
    });
  }, [activeSessionId]);

  const renameSession = useCallback((sessionId: string, title: string) => {
    setSessions(prev => prev.map(session =>
      session.id === sessionId
        ? { ...session, title, updatedAt: Date.now() }
        : session
    ));
  }, []);

  // Stop generation function
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  /**
   * Get ancestral context: collect all messages from ancestor threads (Root -> ... -> Parent)
   * This enables "one-way context inheritance" where child threads know about their ancestors
   * but ancestors don't know about their children.
   * 
   * @param threadId - The current thread ID to find ancestors for
   * @param threadsMap - The threads map to search in
   * @returns Array of messages in chronological order from root to immediate parent
   */
  const getAncestralContext = useCallback((
    threadId: string,
    threadsMap: Map<string, ThreadNode>
  ): { role: "user" | "assistant"; content: string }[] => {
    const ancestorMessages: { role: "user" | "assistant"; content: string }[] = [];
    const ancestorChain: ThreadNode[] = [];

    // Build the ancestor chain by walking up the tree
    let currentThread = threadsMap.get(threadId);
    while (currentThread?.parentId) {
      const parentThread = threadsMap.get(currentThread.parentId);
      if (parentThread) {
        ancestorChain.unshift(parentThread); // Add to front to maintain root-first order
        currentThread = parentThread;
      } else {
        break;
      }
    }

    // Collect messages from each ancestor in order (root first)
    for (const ancestorThread of ancestorChain) {
      // Get the branch point: find where the child branched from
      // For proper context, we include all messages up to and including the parentMessageId
      const childThread = threadsMap.get(threadId);
      let parentMessageId: string | null = null;

      // Find if this ancestor is the direct parent
      for (const [, thread] of threadsMap) {
        if (thread.parentId === ancestorThread.id) {
          // Check if this leads to our target thread
          let checkThread: ThreadNode | undefined = thread;
          while (checkThread) {
            if (checkThread.id === threadId) {
              parentMessageId = thread.parentMessageId;
              break;
            }
            // Find child of current checkThread that leads to threadId
            let found = false;
            for (const [, t] of threadsMap) {
              if (t.parentId === checkThread.id) {
                checkThread = t;
                found = true;
                break;
              }
            }
            if (!found) break;
          }
          if (parentMessageId) break;
        }
      }

      // Collect messages from this ancestor
      for (const message of ancestorThread.messages) {
        // Skip branch welcome messages (they start with 🌿)
        if (message.role === "assistant" && message.content.startsWith("🌿")) {
          continue;
        }

        ancestorMessages.push({
          role: message.role,
          content: message.content,
        });

        // If this is the message where the branch was created, stop here for this ancestor
        if (parentMessageId && message.id === parentMessageId) {
          break;
        }
      }
    }

    return ancestorMessages;
  }, []);

  // Load sessions from localStorage on mount
  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const initializeSessions = async () => {
      // Try loading v2 format first
      try {
        const storedV2 = safeGetItem(STORAGE_KEY);
        if (storedV2) {
          const parsed = deserializeStateV2(storedV2);
          if (parsed && parsed.sessions.length > 0) {
            setSessions(parsed.sessions);
            setActiveSessionId(parsed.activeSessionId);
            setIsHydrated(true);
            console.log(`Loaded ${parsed.sessions.length} sessions from storage (v2)`);
            return;
          }
        }
      } catch (error) {
        console.error("Error loading v2 data:", error);
      }

      // Try migrating legacy v1 format
      try {
        const storedV1 = safeGetItem(LEGACY_STORAGE_KEY);
        if (storedV1) {
          const migrated = migrateLegacyState(storedV1);
          if (migrated && migrated.sessions.length > 0) {
            setSessions(migrated.sessions);
            setActiveSessionId(migrated.activeSessionId);
            setIsHydrated(true);
            console.log("Migrated legacy data to v2 format");
            // Remove legacy data after successful migration
            safeRemoveItem(LEGACY_STORAGE_KEY);
            return;
          }
        }
      } catch (error) {
        console.error("Error migrating legacy data:", error);
      }

      // Try loading from database (for users with DB data)
      try {
        const dbThreads = await loadThreadsFromDB();
        if (dbThreads.size > 0) {
          // Create a session from DB threads
          const dbSession: Session = {
            id: `session_db_${Date.now()}`,
            title: "Database Conversation",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            threads: dbThreads,
            activeThreadId: Array.from(dbThreads.keys())[0],
          };
          setSessions([dbSession]);
          setActiveSessionId(dbSession.id);
          setIsHydrated(true);
          console.log(`Loaded ${dbThreads.size} threads from database`);
          return;
        }
      } catch (error) {
        console.error("Failed to load from DB:", error);
      }

      // No data - create fresh state with default session
      const defaultSession = createDefaultSession();
      setSessions([defaultSession]);
      setActiveSessionId(defaultSession.id);
      setIsHydrated(true);
    };

    initializeSessions();
  }, []);

  // Save to localStorage whenever sessions change
  useEffect(() => {
    if (!isHydrated || sessions.length === 0) return;

    const serialized = serializeStateV2(sessions, activeSessionId);
    if (serialized) {
      safeSetItem(STORAGE_KEY, serialized);
    }
  }, [sessions, activeSessionId, isHydrated]);

  // Delete a thread and all its children
  const deleteThread = useCallback((id: string) => {
    setThreads(prev => {
      const updated = new Map(prev);

      // Collect all thread IDs to delete (the thread and its descendants)
      const idsToDelete = new Set<string>();

      function collectDescendants(threadId: string) {
        idsToDelete.add(threadId);
        // Find all threads that have this thread as parent
        for (const [childId, thread] of updated) {
          if (thread.parentId === threadId) {
            collectDescendants(childId);
          }
        }
      }

      collectDescendants(id);

      // Delete all collected threads
      for (const deleteId of idsToDelete) {
        updated.delete(deleteId);
      }

      return updated;
    });

    // If the deleted thread was active, switch to the first available
    if (activeThreadId === id) {
      setThreads(prev => {
        const remaining = Array.from(prev.keys());
        if (remaining.length > 0) {
          setActiveThreadIdInSession(remaining[0]);
        } else {
          // No threads left, create a fresh state
          const defaultState = createDefaultState();
          setActiveThreadIdInSession(defaultState.activeThreadId);
          return defaultState.threads;
        }
        return prev;
      });
    }

    // Try to delete from DB (ignore errors since localStorage works)
    fetch(`/api/threads/${id}`, { method: 'DELETE' }).catch(() => { });
  }, [activeThreadId]);

  // Clear all data
  const clearAllData = useCallback(() => {
    safeRemoveItem(STORAGE_KEY);
    const defaultState = createDefaultState();
    setThreads(defaultState.threads);
    setActiveThreadIdInSession(defaultState.activeThreadId);
  }, []);

  // Set active thread
  const setActiveThread = useCallback((id: string) => {
    if (threads.has(id)) {
      setActiveThreadIdInSession(id);
    }
  }, [threads]);

  // Navigate to thread and switch to chat mode
  const navigateToThread = useCallback((id: string) => {
    if (threads.has(id)) {
      setActiveThreadIdInSession(id);
      onNavigateToChat?.();
    }
  }, [threads, onNavigateToChat]);

  // Get parent thread
  const getParentThread = useCallback((id: string): ThreadNode | null => {
    const thread = threads.get(id);
    if (!thread || !thread.parentId) return null;
    return threads.get(thread.parentId) || null;
  }, [threads]);

  // Input draft management for selection menu
  const setInputDraft = useCallback((text: string) => {
    setInputDraftState(text);
  }, []);

  const clearInputDraft = useCallback(() => {
    setInputDraftState("");
  }, []);

  // Create a branch from a specific message
  const createBranch = useCallback((parentId: string, contextMessageId: string) => {
    const parentThread = threads.get(parentId);
    if (!parentThread) return;

    // Find the context message
    const contextMessage = parentThread.messages.find(m => m.id === contextMessageId);

    // Create new branch thread
    const newThread: ThreadNode = {
      id: generateThreadId(),
      messages: [],
      parentId,
      parentMessageId: contextMessageId,
      title: contextMessage
        ? `Branch: ${contextMessage.content.substring(0, 30)}...`
        : "New Branch",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Add welcome message to branch
    const branchWelcome: Message = {
      id: generateMessageId(),
      role: "assistant",
      content: `🌿 **Branching from the conversation.**\n\nYou can explore a different direction here while keeping the original thread intact.\n\n> *Context from parent:*\n> "${contextMessage?.content.substring(0, 150)}${(contextMessage?.content.length || 0) > 150 ? '...' : ''}"`,
      thoughts: "User created a branch to explore an alternative path. I should acknowledge this and be ready for their new direction.",
      timestamp: Date.now(),
    };
    newThread.messages.push(branchWelcome);

    setThreads(prev => {
      const updated = new Map(prev);
      updated.set(newThread.id, newThread);
      return updated;
    });

    // Set the new branch as active
    setActiveThreadIdInSession(newThread.id);
  }, [threads]);

  // Create a branch with an immediate user query (for selection menu actions)
  const createBranchWithQuery = useCallback(async (
    parentId: string,
    contextMessageId: string,
    userQuery: string,
    selectedContext: string
  ) => {
    const parentThread = threads.get(parentId);
    if (!parentThread) return;

    // Create new branch thread
    const newThreadId = generateThreadId();
    const now = Date.now();

    // Format the user message with context
    const formattedQuery = `> ${selectedContext.replace(/\n/g, "\n> ")}\n\n${userQuery}`;

    // Create user message
    const userMessage: Message = {
      id: generateMessageId(),
      role: "user",
      content: formattedQuery,
      timestamp: now,
    };

    const newThread: ThreadNode = {
      id: newThreadId,
      messages: [userMessage],
      parentId,
      parentMessageId: contextMessageId,
      title: userQuery.substring(0, 35) + (userQuery.length > 35 ? "..." : ""),
      createdAt: now,
      updatedAt: now,
    };

    setThreads(prev => {
      const updated = new Map(prev);
      updated.set(newThread.id, newThread);
      return updated;
    });

    // Set the new branch as active and switch to chat
    setActiveThreadIdInSession(newThread.id);
    onNavigateToChat?.();

    // Call real API
    setIsLoading(true);

    // Prepare messages for API with ancestral context
    // Get messages from all ancestors of the parent thread
    const ancestralMessages = getAncestralContext(parentId, threads);

    // Get messages from parent thread up to and including the branch point
    const parentMessages: { role: "user" | "assistant"; content: string }[] = [];
    for (const message of parentThread.messages) {
      // Skip branch welcome messages
      if (message.role === "assistant" && message.content.startsWith("🌿")) {
        continue;
      }
      parentMessages.push({
        role: message.role,
        content: message.content,
      });
      // Stop at the message where this branch was created
      if (message.id === contextMessageId) {
        break;
      }
    }

    // Combine: ancestral context + parent messages up to branch point + new user message
    const apiMessages = [
      ...ancestralMessages,
      ...parentMessages,
      { role: "user" as const, content: formattedQuery },
    ];

    // Create placeholder assistant message for streaming
    const assistantMessageId = generateMessageId();
    let streamedContent = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();

      // Add empty assistant message to start streaming into
      setThreads(prev => {
        const updated = new Map(prev);
        const thread = updated.get(newThreadId);
        if (thread) {
          const assistantMessage: Message = {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            timestamp: Date.now(),
          };
          const updatedThread: ThreadNode = {
            ...thread,
            messages: [...thread.messages, assistantMessage],
            updatedAt: Date.now(),
          };
          updated.set(newThreadId, updatedThread);
        }
        return updated;
      });

      // Read streaming response
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        streamedContent += chunk;

        // Parse and update the message with streamed content
        const { thoughts, content: parsedContent } = parseR1Response(streamedContent);

        setThreads(prev => {
          const updated = new Map(prev);
          const thread = updated.get(newThreadId);
          if (thread) {
            const updatedMessages = thread.messages.map(m =>
              m.id === assistantMessageId
                ? { ...m, content: parsedContent, thoughts }
                : m
            );
            const updatedThread: ThreadNode = {
              ...thread,
              messages: updatedMessages,
              updatedAt: Date.now(),
            };
            updated.set(newThreadId, updatedThread);
          }
          return updated;
        });
      }
    } catch (error) {
      console.error("API call failed, using mock response:", error);

      // Fallback to mock response
      const rawResponse = MOCK_RESPONSES[mockIndexRef.current % MOCK_RESPONSES.length];
      mockIndexRef.current += 1;

      const { thoughts, content: parsedContent } = parseR1Response(rawResponse);

      const assistantMessage: Message = {
        id: assistantMessageId || generateMessageId(),
        role: "assistant",
        content: parsedContent,
        thoughts,
        timestamp: Date.now(),
      };

      setThreads(prev => {
        const updated = new Map(prev);
        const thread = updated.get(newThreadId);
        if (thread) {
          const hasPlaceholder = thread.messages.some(m => m.id === assistantMessageId);
          const updatedMessages = hasPlaceholder
            ? thread.messages.map(m =>
              m.id === assistantMessageId ? assistantMessage : m
            )
            : [...thread.messages, assistantMessage];

          const updatedThread: ThreadNode = {
            ...thread,
            messages: updatedMessages,
            updatedAt: Date.now(),
          };
          updated.set(newThreadId, updatedThread);
        }
        return updated;
      });
    }

    setIsLoading(false);
  }, [threads, onNavigateToChat, getAncestralContext]);

  // Send message to active thread
  const sendMessage = useCallback(async (content: string) => {
    const activeThread = threads.get(activeThreadId);
    if (!activeThread) return;

    // Create user message
    const userMessage: Message = {
      id: generateMessageId(),
      role: "user",
      content,
      timestamp: Date.now(),
    };

    // Update thread with user message
    setThreads(prev => {
      const updated = new Map(prev);
      const thread = updated.get(activeThreadId);
      if (thread) {
        const updatedThread: ThreadNode = {
          ...thread,
          messages: [...thread.messages, userMessage],
          title: thread.messages.length === 1 ? content.substring(0, 40) : thread.title,
          updatedAt: Date.now(),
        };
        updated.set(activeThreadId, updatedThread);
      }
      return updated;
    });

    setIsLoading(true);

    // Create AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Prepare messages for API with ancestral context
    // This enables "one-way context inheritance" - child threads know about ancestors
    const currentThread = threads.get(activeThreadId);

    // Get messages from all ancestor threads (Root -> ... -> Parent)
    const ancestralMessages = getAncestralContext(activeThreadId, threads);

    // Get messages from current thread (excluding branch welcome messages)
    const currentThreadMessages = (currentThread?.messages || [])
      .filter(m => !(m.role === "assistant" && m.content.startsWith("🌿")))
      .map(m => ({
        role: m.role,
        content: m.content,
      }));

    // Combine: ancestral context + current thread messages + new user message
    const allMessages = [
      ...ancestralMessages,
      ...currentThreadMessages,
      { role: userMessage.role, content: userMessage.content },
    ];

    // Create placeholder assistant message for streaming
    const assistantMessageId = generateMessageId();
    let streamedContent = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: allMessages }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();

      // Add empty assistant message to start streaming into
      setThreads(prev => {
        const updated = new Map(prev);
        const thread = updated.get(activeThreadId);
        if (thread) {
          const assistantMessage: Message = {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            timestamp: Date.now(),
          };
          const updatedThread: ThreadNode = {
            ...thread,
            messages: [...thread.messages, assistantMessage],
            updatedAt: Date.now(),
          };
          updated.set(activeThreadId, updatedThread);
        }
        return updated;
      });

      // Read streaming response
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        streamedContent += chunk;

        // Parse and update the message with streamed content
        const { thoughts, content: parsedContent } = parseR1Response(streamedContent);

        setThreads(prev => {
          const updated = new Map(prev);
          const thread = updated.get(activeThreadId);
          if (thread) {
            const updatedMessages = thread.messages.map(m =>
              m.id === assistantMessageId
                ? { ...m, content: parsedContent, thoughts }
                : m
            );
            const updatedThread: ThreadNode = {
              ...thread,
              messages: updatedMessages,
              updatedAt: Date.now(),
            };
            updated.set(activeThreadId, updatedThread);
          }
          return updated;
        });
      }

      // Stream completed - save both messages to database
      const finalParsed = parseR1Response(streamedContent);

      // Save user message to DB
      saveMessageToDB(activeThreadId, "user", content).catch(err =>
        console.error("Failed to save user message:", err)
      );

      // Save assistant message to DB  
      saveMessageToDB(
        activeThreadId,
        "assistant",
        finalParsed.content,
        finalParsed.thoughts
      ).catch(err => console.error("Failed to save assistant message:", err));

    } catch (error) {
      // Check if this was an abort (user stopped generation)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Generation stopped by user');
        // Keep already streamed content - don't use mock response
        // The partial content is already in the thread from streaming updates
        abortControllerRef.current = null;
        setIsLoading(false);
        return;
      }

      console.error("API call failed, using mock response:", error);

      // Fallback to mock response
      const rawResponse = MOCK_RESPONSES[mockIndexRef.current % MOCK_RESPONSES.length];
      mockIndexRef.current += 1;

      const { thoughts, content: parsedContent } = parseR1Response(rawResponse);

      const assistantMessage: Message = {
        id: assistantMessageId || generateMessageId(),
        role: "assistant",
        content: parsedContent,
        thoughts,
        timestamp: Date.now(),
      };

      setThreads(prev => {
        const updated = new Map(prev);
        const thread = updated.get(activeThreadId);
        if (thread) {
          // Check if we already added a placeholder message
          const hasPlaceholder = thread.messages.some(m => m.id === assistantMessageId);
          const updatedMessages = hasPlaceholder
            ? thread.messages.map(m =>
              m.id === assistantMessageId ? assistantMessage : m
            )
            : [...thread.messages, assistantMessage];

          const updatedThread: ThreadNode = {
            ...thread,
            messages: updatedMessages,
            updatedAt: Date.now(),
          };
          updated.set(activeThreadId, updatedThread);
        }
        return updated;
      });

      // Save mock response to DB as well (for consistency)
      saveMessageToDB(activeThreadId, "user", content).catch(() => { });
      saveMessageToDB(activeThreadId, "assistant", parsedContent, thoughts).catch(() => { });
    }

    abortControllerRef.current = null;
    setIsLoading(false);
  }, [threads, activeThreadId, getAncestralContext]);

  // Build React Flow elements
  const { nodes, edges } = useMemo(() => {
    if (!isHydrated || threads.size === 0) {
      return { nodes: [], edges: [] };
    }
    return buildFlowElements(threads, activeThreadId, setActiveThread, createBranch, navigateToThread);
  }, [threads, activeThreadId, setActiveThread, createBranch, navigateToThread, isHydrated]);

  const value: CanvasContextType = useMemo(() => ({
    // Session management
    sessions,
    activeSessionId,
    currentSession,

    // Current session state (derived)
    threads,
    activeThreadId,
    nodes,
    edges,
    isLoading,
    inputDraft,

    // Session actions
    createSession,
    switchSession,
    deleteSession,
    renameSession,

    // Thread actions
    setActiveThread,
    sendMessage,
    createBranch,
    createBranchWithQuery,
    deleteThread,
    clearAllData,
    navigateToThread,
    getParentThread,
    setInputDraft,
    clearInputDraft,
    stopGeneration,
  }), [
    sessions, activeSessionId, currentSession,
    threads, activeThreadId, nodes, edges, isLoading, inputDraft,
    createSession, switchSession, deleteSession, renameSession,
    setActiveThread, sendMessage, createBranch, createBranchWithQuery,
    deleteThread, clearAllData, navigateToThread, getParentThread,
    setInputDraft, clearInputDraft, stopGeneration
  ]);

  // Show loading state during hydration
  if (!isHydrated) {
    return (
      <CanvasContext.Provider value={{
        // Session management
        sessions: [],
        activeSessionId: "",
        currentSession: null,

        // Current session state
        threads: new Map(),
        activeThreadId: "",
        nodes: [],
        edges: [],
        isLoading: false,
        inputDraft: "",

        // Session actions
        createSession: () => { },
        switchSession: () => { },
        deleteSession: () => { },
        renameSession: () => { },

        // Thread actions
        setActiveThread: () => { },
        sendMessage: async () => { },
        createBranch: () => { },
        createBranchWithQuery: async () => { },
        deleteThread: () => { },
        clearAllData: () => { },
        navigateToThread: () => { },
        getParentThread: () => null,
        setInputDraft: () => { },
        clearInputDraft: () => { },
        stopGeneration: () => { },
      }}>
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-3 text-slate-500">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
            <span>Loading DeepThink...</span>
          </div>
        </div>
      </CanvasContext.Provider>
    );
  }

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  );
}
