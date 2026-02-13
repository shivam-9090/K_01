import React from "react";
import { Sidebar } from "./Sidebar";
import { AppCommandMenu } from "./AppCommandMenu";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 w-full overflow-y-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:ml-0 pt-16 lg:pt-8 transition-all">
        {children}
      </main>
      <AppCommandMenu />
    </div>
  );
};
