/**
 * Canvas data models for DeepThink v4.2
 * Thread-based node architecture
 */

import { Message } from "./chat";
import { Node, Edge } from "reactflow";

/**
 * A Thread Node represents a complete conversation on a specific topic
 */
export interface ThreadNode {
  /** Unique identifier for the thread */
  id: string;
  /** All messages in this thread (user + assistant turns) */
  messages: Message[];
  /** Parent thread ID (null for root thread) */
  parentId: string | null;
  /** The message ID from parent that triggered this branch */
  parentMessageId: string | null;
  /** Thread title (auto-generated or user-defined) */
  title: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last activity timestamp */
  updatedAt: number;
}

/**
 * Data structure for React Flow thread nodes
 */
export interface ThreadNodeData {
  thread: ThreadNode;
  isActive: boolean;
  onSetActive: (id: string) => void;
  onBranch: (threadId: string, messageId: string) => void;
  onNavigateToChat: (id: string) => void;
}

/**
 * Tree node structure for hierarchical sidebar
 */
export interface ThreadTreeNode {
  thread: ThreadNode;
  children: ThreadTreeNode[];
  depth: number;
}

/**
 * Build a tree structure from flat threads map
 */
export function buildThreadTree(threads: Map<string, ThreadNode>): ThreadTreeNode[] {
  const threadArray = Array.from(threads.values());
  const childrenMap = new Map<string | null, ThreadNode[]>();
  
  // Group threads by parentId
  threadArray.forEach(thread => {
    const parentId = thread.parentId;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(thread);
  });
  
  // Recursive function to build tree
  function buildNode(thread: ThreadNode, depth: number): ThreadTreeNode {
    const children = childrenMap.get(thread.id) || [];
    return {
      thread,
      children: children
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(child => buildNode(child, depth + 1)),
      depth,
    };
  }
  
  // Get root threads and build tree
  const rootThreads = childrenMap.get(null) || [];
  return rootThreads
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(thread => buildNode(thread, 0));
}

/**
 * Canvas state for managing all threads
 */
export interface CanvasState {
  /** All thread nodes */
  threads: Map<string, ThreadNode>;
  /** Currently active thread receiving input */
  activeThreadId: string;
  /** React Flow nodes */
  nodes: Node<ThreadNodeData>[];
  /** React Flow edges */
  edges: Edge[];
}

/**
 * Generate a unique thread ID
 */
export function generateThreadId(): string {
  return `thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new thread
 */
export function createThread(
  parentId: string | null = null,
  parentMessageId: string | null = null,
  initialMessages: Message[] = []
): ThreadNode {
  const id = generateThreadId();
  const now = Date.now();
  
  return {
    id,
    messages: initialMessages,
    parentId,
    parentMessageId,
    title: parentId ? "Branch Thread" : "Main Thread",
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Generate a title for a thread based on its first message
 */
export function generateThreadTitle(thread: ThreadNode): string {
  if (thread.messages.length === 0) {
    return thread.parentId ? "New Branch" : "New Conversation";
  }
  
  const firstUserMessage = thread.messages.find(m => m.role === "user");
  if (firstUserMessage) {
    const title = firstUserMessage.content.substring(0, 40);
    return title.length < firstUserMessage.content.length 
      ? `${title}...` 
      : title;
  }
  
  return thread.title;
}

/**
 * Convert threads to React Flow nodes with dagre layout
 */
export function threadsToFlowElements(
  threads: Map<string, ThreadNode>,
  activeThreadId: string,
  onSetActive: (id: string) => void,
  onBranch: (threadId: string, messageId: string) => void
): { nodes: Node<ThreadNodeData>[]; edges: Edge[] } {
  const nodes: Node<ThreadNodeData>[] = [];
  const edges: Edge[] = [];
  
  threads.forEach((thread) => {
    nodes.push({
      id: thread.id,
      type: "threadNode",
      position: { x: 0, y: 0 }, // Will be set by layout
      data: {
        thread,
        isActive: thread.id === activeThreadId,
        onSetActive,
        onBranch,
      },
    });
    
    // Create edge from parent to this thread
    if (thread.parentId) {
      edges.push({
        id: `edge-${thread.parentId}-${thread.id}`,
        source: thread.parentId,
        target: thread.id,
        animated: true,
        style: { 
          stroke: "#6366f1", 
          strokeWidth: 2,
        },
        label: "Branch",
        labelStyle: { 
          fontSize: 10, 
          fontWeight: 500,
          fill: "#6366f1",
        },
        labelBgStyle: { 
          fill: "white", 
          fillOpacity: 0.9,
        },
      });
    }
  });
  
  return { nodes, edges };
}

