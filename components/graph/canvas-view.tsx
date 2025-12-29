"use client";

import { useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  PanOnScrollMode,
} from "reactflow";
import "reactflow/dist/style.css";

import { useCanvas } from "@/contexts/canvas-context";
import { ThreadNode } from "./thread-node";
import { ChatInput } from "@/components/chat/chat-input";
import { GitBranch, MousePointer2 } from "lucide-react";

// Define custom node types
const nodeTypes = {
  threadNode: ThreadNode,
};

function CanvasFlowInner() {
  const { nodes, edges, isLoading, sendMessage, activeThreadId } = useCanvas();
  const [flowNodes, setNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, setCenter, getNode } = useReactFlow();
  const prevNodeCountRef = useRef(nodes.length);
  const prevActiveThreadRef = useRef(activeThreadId);

  // Sync nodes and edges from context
  useEffect(() => {
    setNodes(nodes);
    setEdges(edges);
  }, [nodes, edges, setNodes, setEdges]);

  // Auto-pan to new nodes when branching
  useEffect(() => {
    const nodeCount = nodes.length;
    const wasNewNodeAdded = nodeCount > prevNodeCountRef.current;
    const activeChanged = activeThreadId !== prevActiveThreadRef.current;

    // If a new node was added (branching), focus on the new active node
    if (wasNewNodeAdded && activeChanged) {
      const timer = setTimeout(() => {
        const activeNode = getNode(activeThreadId);
        if (activeNode) {
          // Smoothly pan to the new node
          setCenter(
            activeNode.position.x + 200, // Center on the node (half width)
            activeNode.position.y + 200, // Center on the node (half height)
            { zoom: 0.8, duration: 500 }
          );
        }
      }, 150);

      prevNodeCountRef.current = nodeCount;
      prevActiveThreadRef.current = activeThreadId;
      return () => clearTimeout(timer);
    }

    // Just active thread changed (clicking on different node)
    if (activeChanged && !wasNewNodeAdded) {
      prevActiveThreadRef.current = activeThreadId;
    }

    prevNodeCountRef.current = nodeCount;
  }, [nodes.length, activeThreadId, getNode, setCenter]);

  // Initial fit view
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.3, duration: 300 });
    }, 200);
    return () => clearTimeout(timer);
  }, [fitView]);

  const handleSendMessage = useCallback(async (content: string) => {
    await sendMessage(content);
  }, [sendMessage]);

  return (
    <div className="flex flex-col h-full">
      {/* React Flow Canvas */}
      <div className="flex-1 min-h-0 relative">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.15}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
          proOptions={{ hideAttribution: true }}
          className="bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20"
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnScroll={true}
          panOnScrollMode={PanOnScrollMode.Free}
          zoomOnScroll={true}
          zoomOnPinch={true}
          selectNodesOnDrag={false}
        >
          {/* Dot pattern background */}
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#cbd5e1"
            className="dark:opacity-30"
          />

          {/* Secondary grid for depth */}
          <Background
            id="grid"
            variant={BackgroundVariant.Lines}
            gap={100}
            size={0.5}
            color="#e2e8f0"
            className="dark:opacity-10"
          />

          {/* Controls - Bottom Right */}
          <Controls
            className="!bg-white/90 dark:!bg-slate-800/90 !border-slate-200 dark:!border-slate-700 !rounded-xl !shadow-xl backdrop-blur-sm"
            showZoom
            showFitView
            showInteractive={false}
            position="bottom-right"
          />

          {/* MiniMap - Top Right */}
          <MiniMap
            nodeColor={(node) => {
              if (node.data?.isActive) {
                return "#6366f1";
              }
              return "#94a3b8";
            }}
            nodeStrokeColor={(node) => {
              if (node.data?.isActive) {
                return "#4f46e5";
              }
              return "#64748b";
            }}
            nodeBorderRadius={8}
            maskColor="rgba(0, 0, 0, 0.05)"
            className="!bg-white/90 dark:!bg-slate-800/90 !border-slate-200 dark:!border-slate-700 !rounded-xl !shadow-xl backdrop-blur-sm"
            pannable
            zoomable
            position="top-right"
          />

          {/* Help Panel - Top Left */}
          <Panel position="top-left" className="!m-4">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Canvas Controls
              </h4>
              <div className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <MousePointer2 className="size-3" />
                  <span>Click node to activate</span>
                </div>
                <div className="flex items-center gap-2">
                  <GitBranch className="size-3" />
                  <span>Hover AI message → Branch</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">⌘ + Scroll</span>
                  <span>Zoom</span>
                </div>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Chat Input - Fixed at bottom */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={isLoading}
        placeholder="Continue the active thread... (Enter to send)"
      />
    </div>
  );
}

export function CanvasView() {
  return (
    <ReactFlowProvider>
      <CanvasFlowInner />
    </ReactFlowProvider>
  );
}
