"use client";

import { useState, createContext, useContext, ReactNode, useCallback } from "react";
import { Sidebar } from "./sidebar";
import { Header, ViewMode } from "./header";
import { CanvasProvider } from "@/contexts/canvas-context";

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error("useViewMode must be used within AppShell");
  }
  return context;
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("chat"); // Default to chat mode

  // Callback to switch to chat mode (passed to CanvasProvider)
  const handleNavigateToChat = useCallback(() => {
    setViewMode("chat");
  }, []);

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      <CanvasProvider onNavigateToChat={handleNavigateToChat}>
        <div className="flex h-full">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Header with View Mode Toggle */}
            <Header 
              viewMode={viewMode} 
              onViewModeChange={setViewMode} 
            />
            
            {/* Scrollable Content */}
            <main className="flex-1 overflow-hidden">
              {children}
            </main>
          </div>
        </div>
      </CanvasProvider>
    </ViewModeContext.Provider>
  );
}
