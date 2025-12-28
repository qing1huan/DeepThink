"use client";

import { useEffect, useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";

import { Message } from "@/types/chat";
import { getLayoutedElementsFromMessages, GraphNodeData } from "@/lib/graph-utils";
import { ThoughtNode } from "./thought-node";
import { UserNode } from "./user-node";
import { AssistantNode } from "./assistant-node";

// Define custom node types
const nodeTypes = {
  thoughtNode: ThoughtNode,
  userNode: UserNode,
  assistantNode: AssistantNode,
};

interface GraphViewProps {
  messages: Message[];
}

export function GraphView({ messages }: GraphViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Update graph when messages change
  useEffect(() => {
    if (messages.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = 
      getLayoutedElementsFromMessages(messages, "TB");
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [messages, setNodes, setEdges]);

  // Fit view on initial load
  const onInit = useCallback((reactFlowInstance: { fitView: () => void }) => {
    setTimeout(() => {
      reactFlowInstance.fitView();
    }, 100);
  }, []);

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
            No Conversation Yet
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Start a conversation to see the graph visualization
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.3}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
        className="bg-slate-50 dark:bg-slate-900"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#cbd5e1"
          className="dark:!bg-slate-900"
        />
        <Controls
          className="!bg-white dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700 !rounded-lg !shadow-lg"
          showZoom
          showFitView
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case "userNode":
                return "#3b82f6";
              case "thoughtNode":
                return "#f59e0b";
              case "assistantNode":
                return "#a855f7";
              default:
                return "#94a3b8";
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="!bg-white dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700 !rounded-lg !shadow-lg"
        />
      </ReactFlow>
    </div>
  );
}

