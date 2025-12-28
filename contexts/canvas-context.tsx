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

// LocalStorage key (for backwards compatibility)
const STORAGE_KEY = "deepthink-canvas-v1";

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
  // State
  threads: Map<string, ThreadNode>;
  activeThreadId: string;
  nodes: Node<ThreadNodeData>[];
  edges: Edge[];
  isLoading: boolean;
  inputDraft: string;

  // Actions
  setActiveThread: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  createBranch: (parentId: string, contextMessageId: string) => void;
  createBranchWithQuery: (
    parentId: string,
    contextMessageId: string,
    userQuery: string,
    selectedContext: string
  ) => Promise<void>;
  clearAllData: () => void;
  navigateToThread: (id: string) => void;
  getParentThread: (id: string) => ThreadNode | null;
  setInputDraft: (text: string) => void;
  clearInputDraft: () => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvas must be used within CanvasProvider");
  }
  return context;
}

// Serialization helpers for Map
interface StoredState {
  threads: [string, ThreadNode][];
  activeThreadId: string;
  version?: number;
}

function serializeState(threads: Map<string, ThreadNode>, activeThreadId: string): string {
  try {
    const state: StoredState = {
      threads: Array.from(threads.entries()),
      activeThreadId,
      version: 1,
    };
    return JSON.stringify(state);
  } catch (error) {
    console.error("Failed to serialize state:", error);
    return "";
  }
}

function deserializeState(json: string): { threads: Map<string, ThreadNode>; activeThreadId: string } | null {
  try {
    if (!json || json.trim() === "") {
      return null;
    }

    const state: StoredState = JSON.parse(json);

    // Validate the parsed data
    if (!state || !Array.isArray(state.threads) || typeof state.activeThreadId !== "string") {
      console.warn("Invalid stored state structure, resetting...");
      return null;
    }

    // Validate each thread
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
      console.warn("No valid threads found, resetting...");
      return null;
    }

    const threadsMap = new Map(validThreads);

    // Ensure activeThreadId exists in threads
    if (!threadsMap.has(state.activeThreadId)) {
      const firstThreadId = validThreads[0][0];
      return {
        threads: threadsMap,
        activeThreadId: firstThreadId,
      };
    }

    return {
      threads: threadsMap,
      activeThreadId: state.activeThreadId,
    };
  } catch (error) {
    console.error("Failed to deserialize state:", error);
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
  const [threads, setThreads] = useState<Map<string, ThreadNode>>(() => new Map());
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [inputDraft, setInputDraftState] = useState<string>("");
  const mockIndexRef = useRef(0);
  const isInitializedRef = useRef(false);

  // Load from database on mount (then fallback to localStorage)
  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const initializeThreads = async () => {
      // Try loading from database first
      try {
        const dbThreads = await loadThreadsFromDB();
        if (dbThreads.size > 0) {
          setThreads(dbThreads);
          // Set the first thread as active
          const firstThreadId = Array.from(dbThreads.keys())[0];
          setActiveThreadId(firstThreadId);
          setIsHydrated(true);
          console.log(`Loaded ${dbThreads.size} threads from database`);
          return;
        }
      } catch (error) {
        console.error("Failed to load from DB, trying localStorage:", error);
      }

      // Fallback to localStorage
      try {
        const stored = safeGetItem(STORAGE_KEY);
        if (stored) {
          const parsed = deserializeState(stored);
          if (parsed && parsed.threads.size > 0) {
            setThreads(parsed.threads);
            setActiveThreadId(parsed.activeThreadId);
            setIsHydrated(true);
            return;
          }
        }
      } catch (error) {
        console.error("Error loading stored data, resetting:", error);
        safeRemoveItem(STORAGE_KEY);
      }

      // No data from DB or localStorage - create fresh state
      const defaultState = createDefaultState();
      setThreads(defaultState.threads);
      setActiveThreadId(defaultState.activeThreadId);
      setIsHydrated(true);
    };

    initializeThreads();
  }, []);

  // Save to localStorage whenever threads or activeThreadId changes
  useEffect(() => {
    if (!isHydrated || threads.size === 0) return;

    const serialized = serializeState(threads, activeThreadId);
    if (serialized) {
      safeSetItem(STORAGE_KEY, serialized);
    }
  }, [threads, activeThreadId, isHydrated]);

  // Clear all data
  const clearAllData = useCallback(() => {
    safeRemoveItem(STORAGE_KEY);
    const defaultState = createDefaultState();
    setThreads(defaultState.threads);
    setActiveThreadId(defaultState.activeThreadId);
  }, []);

  // Set active thread
  const setActiveThread = useCallback((id: string) => {
    if (threads.has(id)) {
      setActiveThreadId(id);
    }
  }, [threads]);

  // Navigate to thread and switch to chat mode
  const navigateToThread = useCallback((id: string) => {
    if (threads.has(id)) {
      setActiveThreadId(id);
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
    setActiveThreadId(newThread.id);
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
    setActiveThreadId(newThread.id);
    onNavigateToChat?.();

    // Call real API
    setIsLoading(true);

    // Prepare messages for API
    const apiMessages = [{ role: "user" as const, content: formattedQuery }];

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
  }, [threads, onNavigateToChat]);

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

    // Prepare messages for API
    const currentThread = threads.get(activeThreadId);
    const allMessages = [
      ...(currentThread?.messages || []),
      userMessage,
    ].map(m => ({
      role: m.role,
      content: m.content,
    }));

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

    setIsLoading(false);
  }, [threads, activeThreadId]);

  // Build React Flow elements
  const { nodes, edges } = useMemo(() => {
    if (!isHydrated || threads.size === 0) {
      return { nodes: [], edges: [] };
    }
    return buildFlowElements(threads, activeThreadId, setActiveThread, createBranch, navigateToThread);
  }, [threads, activeThreadId, setActiveThread, createBranch, navigateToThread, isHydrated]);

  const value: CanvasContextType = useMemo(() => ({
    threads,
    activeThreadId,
    nodes,
    edges,
    isLoading,
    inputDraft,
    setActiveThread,
    sendMessage,
    createBranch,
    createBranchWithQuery,
    clearAllData,
    navigateToThread,
    getParentThread,
    setInputDraft,
    clearInputDraft,
  }), [threads, activeThreadId, nodes, edges, isLoading, inputDraft, setActiveThread, sendMessage, createBranch, createBranchWithQuery, clearAllData, navigateToThread, getParentThread, setInputDraft, clearInputDraft]);

  // Show loading state during hydration
  if (!isHydrated) {
    return (
      <CanvasContext.Provider value={{
        threads: new Map(),
        activeThreadId: "",
        nodes: [],
        edges: [],
        isLoading: false,
        inputDraft: "",
        setActiveThread: () => { },
        sendMessage: async () => { },
        createBranch: () => { },
        createBranchWithQuery: async () => { },
        clearAllData: () => { },
        navigateToThread: () => { },
        getParentThread: () => null,
        setInputDraft: () => { },
        clearInputDraft: () => { },
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
