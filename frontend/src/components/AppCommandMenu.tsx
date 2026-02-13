import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  SettingsIcon,
  UserIcon,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

export function AppCommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const permissions = usePermissions();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            <CommandItem
              onSelect={() => runCommand(() => navigate("/dashboard"))}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>

            {(permissions.canViewAllProjects || permissions.isEmployee) && (
              <CommandItem
                onSelect={() =>
                  runCommand(() =>
                    navigate(
                      permissions.canViewAllProjects
                        ? "/projects"
                        : "/my-projects",
                    ),
                  )
                }
              >
                <FolderKanban className="mr-2 h-4 w-4" />
                <span>Projects</span>
              </CommandItem>
            )}

            <CommandItem onSelect={() => runCommand(() => navigate("/tasks"))}>
              <CheckSquare className="mr-2 h-4 w-4" />
              <span>Tasks</span>
            </CommandItem>

            {permissions.canViewAllEmployees && (
              <CommandItem
                onSelect={() => runCommand(() => navigate("/employees"))}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>Employees</span>
              </CommandItem>
            )}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Settings & Profile">
            <CommandItem
              onSelect={() => runCommand(() => navigate("/profile"))}
            >
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>

            {permissions.isBoss && (
              <CommandItem
                onSelect={() => runCommand(() => navigate("/settings"))}
              >
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Company Settings</span>
                <CommandShortcut>⌘S</CommandShortcut>
              </CommandItem>
            )}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => runCommand(() => logout())}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
