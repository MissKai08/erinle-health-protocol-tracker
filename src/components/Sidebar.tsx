"use client";

import { useState, useEffect } from "react";
import { Link, useLocation, NavLink } from "react-router-dom";
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
  const [theme, setTheme] = useState<"default" | "erinle">("default");
  const location = useLocation();

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "default" | "erinle" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  const handleThemeChange = (newTheme: "default" | "erinle") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

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
                      <img src="/icon.png" className="flex-shrink-0 w-7 h-7 object-contain" alt="Erinlè" />
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

        {/* Theme selector at bottom */}
                <div className="p-4 border-t border-sidebar-border">
                  <div className={cn("flex gap-2", collapsed ? "flex-col items-center" : "flex-row")}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={theme === "default" ? "default" : "ghost"}
                          size="icon"
                          className={cn(
                            "h-9 w-9",
                            theme === "default" && "bg-sidebar-primary text-sidebar-primary-foreground"
                          )}
                          onClick={() => handleThemeChange("default")}
                          aria-label="Default theme"
                        >
                          <span className="material-symbols-rounded">filter_none</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">Default</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={theme === "erinle" ? "default" : "ghost"}
                          size="icon"
                          className={cn(
                            "h-9 w-9",
                            theme === "erinle" && "bg-sidebar-primary text-sidebar-primary-foreground"
                          )}
                          onClick={() => handleThemeChange("erinle")}
                          aria-label="Erinlè theme"
                        >
                          <span className="material-symbols-rounded">auto_awesome</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">Erinlè</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
      </aside>
    </TooltipProvider>
  );
}