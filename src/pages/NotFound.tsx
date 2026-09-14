"use client";

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Search, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mb-6">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="font-heading text-3xl font-bold mb-4">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/sources" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Sources
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}