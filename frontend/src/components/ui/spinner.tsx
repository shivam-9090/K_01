import React from "react";
import { LoaderIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <LoaderIcon
      role="status"
      aria-label="Loading"
      className={cn("h-4 w-4 animate-spin", className)}
      {...props}
    />
  );
}

export function LoadingPage() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <Spinner className="h-8 w-8 text-primary" />
    </div>
  );
}
