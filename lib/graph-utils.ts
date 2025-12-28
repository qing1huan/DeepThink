import dagre from "dagre";
import { Node, Edge, Position } from "reactflow";
import { Message } from "@/types/chat";

// Node dimensions for layout calculation
const NODE_WIDTH = 280;
const NODE_HEIGHT = 80;
const THOUGHT_NODE_HEIGHT = 60;

export type GraphNodeType = "userNode" | "assistantNode" | "thoughtNode";

export interface GraphNodeData {
  label: string;
  content: string;
  fullContent?: string;
  messageId: string;
  role: "user" | "assistant" | "thought";
  timestamp: number;
}

/**
 * Transform messages array into React Flow nodes and edges
 */
export function transformMessagesToGraph(messages: Message[]): {
  nodes: Node<GraphNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<GraphNodeData>[] = [];
  const edges: Edge[] = [];
  
  let previousNodeId: string | null = null;

  messages.forEach((message, index) => {
    if (message.role === "user") {
      // User message node
      const nodeId = `user-${message.id}`;
      nodes.push({
        id: nodeId,
        type: "userNode",
        position: { x: 0, y: 0 }, // Will be set by dagre
        data: {
          label: "You",
          content: truncateText(message.content, 80),
          fullContent: message.content,
          messageId: message.id,
          role: "user",
          timestamp: message.timestamp,
        },
      });

      // Connect to previous node if exists
      if (previousNodeId) {
        edges.push({
          id: `edge-${previousNodeId}-${nodeId}`,
          source: previousNodeId,
          target: nodeId,
          animated: false,
          style: { stroke: "#94a3b8", strokeWidth: 2 },
        });
      }

      previousNodeId = nodeId;
    } else if (message.role === "assistant") {
      // Check if assistant has thoughts
      if (message.thoughts) {
        // Create Thought Node
        const thoughtNodeId = `thought-${message.id}`;
        nodes.push({
          id: thoughtNodeId,
          type: "thoughtNode",
          position: { x: 0, y: 0 },
          data: {
            label: "Thinking Process",
            content: truncateText(message.thoughts, 60),
            fullContent: message.thoughts,
            messageId: message.id,
            role: "thought",
            timestamp: message.timestamp,
          },
        });

        // Connect previous -> thought
        if (previousNodeId) {
          edges.push({
            id: `edge-${previousNodeId}-${thoughtNodeId}`,
            source: previousNodeId,
            target: thoughtNodeId,
            animated: true,
            style: { stroke: "#f59e0b", strokeWidth: 2, strokeDasharray: "5,5" },
          });
        }

        // Create Content Node
        const contentNodeId = `assistant-${message.id}`;
        nodes.push({
          id: contentNodeId,
          type: "assistantNode",
          position: { x: 0, y: 0 },
          data: {
            label: "DeepThink AI",
            content: truncateText(message.content, 80),
            fullContent: message.content,
            messageId: message.id,
            role: "assistant",
            timestamp: message.timestamp,
          },
        });

        // Connect thought -> content
        edges.push({
          id: `edge-${thoughtNodeId}-${contentNodeId}`,
          source: thoughtNodeId,
          target: contentNodeId,
          animated: true,
          style: { stroke: "#f59e0b", strokeWidth: 2 },
        });

        previousNodeId = contentNodeId;
      } else {
        // No thoughts, just content node
        const contentNodeId = `assistant-${message.id}`;
        nodes.push({
          id: contentNodeId,
          type: "assistantNode",
          position: { x: 0, y: 0 },
          data: {
            label: "DeepThink AI",
            content: truncateText(message.content, 80),
            fullContent: message.content,
            messageId: message.id,
            role: "assistant",
            timestamp: message.timestamp,
          },
        });

        if (previousNodeId) {
          edges.push({
            id: `edge-${previousNodeId}-${contentNodeId}`,
            source: previousNodeId,
            target: contentNodeId,
            animated: false,
            style: { stroke: "#94a3b8", strokeWidth: 2 },
          });
        }

        previousNodeId = contentNodeId;
      }
    }
  });

  return { nodes, edges };
}

/**
 * Apply dagre layout to nodes and edges
 */
export function getLayoutedElements(
  nodes: Node<GraphNodeData>[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
): { nodes: Node<GraphNodeData>[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 50,
    ranksep: 80,
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    const height = node.type === "thoughtNode" ? THOUGHT_NODE_HEIGHT : NODE_HEIGHT;
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const height = node.type === "thoughtNode" ? THOUGHT_NODE_HEIGHT : NODE_HEIGHT;
    
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * Get layouted elements from messages (convenience function)
 */
export function getLayoutedElementsFromMessages(
  messages: Message[],
  direction: "TB" | "LR" = "TB"
): { nodes: Node<GraphNodeData>[]; edges: Edge[] } {
  const { nodes, edges } = transformMessagesToGraph(messages);
  return getLayoutedElements(nodes, edges, direction);
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

