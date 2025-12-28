import dagre from "dagre";
import { Node, Edge, Position } from "reactflow";
import { ThreadNode, ThreadNodeData } from "@/types/canvas";

// Node dimensions for layout calculation
const THREAD_NODE_WIDTH = 400;
const THREAD_NODE_HEIGHT = 380;

/**
 * Apply dagre layout to thread nodes
 */
export function getLayoutedThreadElements(
  nodes: Node<ThreadNodeData>[],
  edges: Edge[],
  direction: "TB" | "LR" = "LR"
): { nodes: Node<ThreadNodeData>[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 100,
    ranksep: 150,
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: THREAD_NODE_WIDTH, 
      height: THREAD_NODE_HEIGHT 
    });
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
    
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - THREAD_NODE_WIDTH / 2,
        y: nodeWithPosition.y - THREAD_NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * Build React Flow elements from threads map
 */
export function buildFlowElements(
  threads: Map<string, ThreadNode>,
  activeThreadId: string,
  onSetActive: (id: string) => void,
  onBranch: (threadId: string, messageId: string) => void,
  onNavigateToChat: (id: string) => void
): { nodes: Node<ThreadNodeData>[]; edges: Edge[] } {
  const nodes: Node<ThreadNodeData>[] = [];
  const edges: Edge[] = [];
  
  threads.forEach((thread) => {
    nodes.push({
      id: thread.id,
      type: "threadNode",
      position: { x: 0, y: 0 },
      data: {
        thread,
        isActive: thread.id === activeThreadId,
        onSetActive,
        onBranch,
        onNavigateToChat,
      },
    });
    
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
        labelStyle: { 
          fontSize: 11, 
          fontWeight: 600,
          fill: "#4f46e5",
        },
        labelBgStyle: { 
          fill: "white", 
          fillOpacity: 0.95,
        },
        labelBgPadding: [8, 4] as [number, number],
        labelBgBorderRadius: 4,
      });
    }
  });
  
  // Apply layout
  return getLayoutedThreadElements(nodes, edges, "LR");
}

