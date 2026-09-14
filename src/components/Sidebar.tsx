"use client";

import { useState } from "react";
import Link from "react-router-dom";
import { useLocation, NavLink } from "react-router-dom";
import {
  Pill,
  Calendar,
  ClipboardList,
  FileText,
  Database,
  Library,
  Upload,
  FileOutput,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navigation = [
  { name: "Today", href: "/", icon: Calendar },
  { name: "History", href: "/history", icon: Calendar },
  { name: "Log", href: "/log", icon: ClipboardList },
  { name: "Protocols", href: "/protocols", icon: FileText },
  {
    name: "Supplements",
    href: "/supplements",
    icon: Pill,
    children: [
      { name: "All", href: "/supplements" },
      { name: "Supplements", href: "/supplements?category=supplement" },
      { name: "Prescriptions", href: "/supplements?category=prescription" },
    ],
  },
  { name: "Sources", href: "/sources", icon: Library },
  { name: "Upload", href: "/upload", icon: Upload },
  { name: "Export Report", href: "/export", icon: FileOutput },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-300 ease-in-out bg-sidebar-background border-r border-sidebar-border",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3" aria-label="Erinlè Health">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-heading font-bold text-lg text-sidebar-foreground">
                Erinlè
              </span>
            )}
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expand" : "Collapse"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1" role="navigation" aria-label="Main navigation">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.children && item.children.some(child => location.pathname.startsWith(child.href)));
            const Icon = item.icon;

            if (item.children) {
              return (
                <Collapsible key={item.name} open={isActive}>
                  <CollapsibleTrigger className="w-full">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-primary"
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                          {!collapsed && <span className="font-medium truncate">{item.name}</span>}
                          {!collapsed && <ChevronRight className="ml-auto h-4 w-4 transition-transform" />}
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  </CollapsibleTrigger>
                  <CollapsibleContent className={cn("overflow-hidden transition-all duration-200", collapsed && "hidden")}>
                    <div className="pl-10 pt-1 pb-2 space-y-1">
                      {item.children.map((child) => {
                        const childActive = location.pathname === child.href;
                        return (
                          <NavLink
                            key={child.href}
                            to={child.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                              childActive
                                ? "bg-sidebar-accent text-sidebar-primary"
                                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                            )}
                            aria-current={childActive ? "page" : undefined}
                          >
                            {!collapsed && <span className="font-medium truncate">{child.name}</span>}
                          </NavLink>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            }

            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="font-medium truncate">{item.name}</span>}
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.name}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Chat / Ask button at bottom */}
        <div className="p-4 border-t border-sidebar-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={cn(
                  "w-full justify-start gap-3 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20",
                  collapsed && "justify-center px-2"
                )}
                onClick={() => {
                  // Open chat drawer - will be handled by parent
                  window.dispatchEvent(new CustomEvent('open-chat'));
                }}
              >
                <MessageSquare className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                {!collapsed && <span className="font-medium">Ask</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Ask
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}