"use client";

import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Sidebar } from "@/components/Sidebar";
import { ChatDrawer } from "@/components/ChatDrawer";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AuthScreen } from "@/components/AuthScreen";
import { cn } from "@/lib/utils";

import Index from "@/pages/Index";
import History from "@/pages/History";
import Log from "@/pages/Log";
import Protocols from "@/pages/Protocols";
import Supplements from "@/pages/Supplements";
import Sources from "@/pages/Sources";
import Upload from "@/pages/Upload";
import ExportReport from "@/pages/ExportReport";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading Erinlè...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main
        className={cn(
          "flex-1 overflow-y-auto transition-all duration-300",
          "md:ml-16 md:w-[calc(100%-4rem)]",
          "lg:ml-64 lg:w-[calc(100%-16rem)]"
        )}
      >
        <div className="page-enter">
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/history" element={<History />} />
            <Route path="/log" element={<Log />} />
            <Route path="/protocols" element={<Protocols />} />
            <Route path="/supplements" element={<Supplements />} />
            <Route path="/sources" element={<Sources />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/export" element={<ExportReport />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
      <ChatDrawer />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
