import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../context/AuthContext";
import socketService from "../services/socket.service";
import chatService, { type ChatMessage } from "../services/chat.service";
import { format } from "date-fns";
import {
  Send,
  Paperclip,
  MoreVertical,
  Trash2,
  Pin,
  File as FileIcon,
  X,
  Image as ImageIcon,
  PinOff,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface ProjectChatProps {
  projectId: string;
}

export const ProjectChat: React.FC<ProjectChatProps> = ({ projectId }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || !projectId) return;

    // Connect socket and join project
    socketService.connect();
    socketService.joinProject(projectId, user.id, user.role);

    const handleReconnect = () => {
      socketService.joinProject(projectId, user.id, user.role);
    };

    socketService.on("reconnect", handleReconnect);

    socketService.on("project-messages", (msgs: ChatMessage[]) => {
      setMessages(msgs);
      scrollToBottom();
    });

    socketService.on("new-message", (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const withoutTemp = prev.filter((m) => !m.id.startsWith("temp-"));
        return [...withoutTemp, msg];
      });
      scrollToBottom();
    });

    socketService.on("message-pinned", (msg: ChatMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    });

    socketService.on(
      "message-deleted",
      ({ messageId }: { messageId: string }) => {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      },
    );

    socketService.on("user-typing", ({ userName, isTyping }: any) => {
      if (isTyping) {
        setTypingUsers((prev) => [...new Set([...prev, userName])]);
      } else {
        setTypingUsers((prev) => prev.filter((u) => u !== userName));
      }
    });

    socketService.on("error", (error: any) => {});

    return () => {
      socketService.leaveProject(projectId);
      socketService.off("reconnect", handleReconnect);
      socketService.off("project-messages");
      socketService.off("new-message");
      socketService.off("message-pinned");
      socketService.off("message-deleted");
      socketService.off("user-typing");
      socketService.off("error");
    };
  }, [projectId, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && selectedFiles.length === 0) || !user) return;

    const messageText = newMessage.trim();
    setIsTyping(false);
    socketService.typing(projectId, user.id, user.email, false);

    try {
      if (selectedFiles.length > 0) {
        await chatService.sendMessageWithFiles(
          projectId,
          messageText,
          selectedFiles,
        );
      } else {
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: ChatMessage = {
          id: tempId,
          message: messageText,
          projectId,
          senderId: user.id,
          sender: {
            id: user.id,
            name: user.email.split("@")[0],
            email: user.email,
            role: user.role,
          },
          attachments: [],
          isPinned: false,
          pinnedBy: null,
          pinnedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        scrollToBottom();
        socketService.sendMessage(projectId, user.id, user.role, messageText);
      }

      setNewMessage("");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {}
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (!user) return;

    if (!isTyping) {
      setIsTyping(true);
      socketService.typing(projectId, user.id, user.email || "User", true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.typing(projectId, user.id, user.email || "User", false);
    }, 2000);
  };

  const handlePinMessage = (messageId: string) => {
    if (!user) return;
    socketService.pinMessage(messageId, user.id, user.role, projectId);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!user) return;
    socketService.deleteMessage(messageId, user.id, user.role, projectId);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const pinnedMessages = messages.filter((m) => m.isPinned);
  const regularMessages = messages.filter((m) => !m.isPinned);

  return (
    <Card className="h-[600px] flex flex-col border-border/50 shadow-sm relative overflow-hidden">
      {/* Header with Pinned Messages Toggle or View */}
      <CardHeader className="py-4 border-b bg-muted/20 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            Team Chat
          </CardTitle>
          {typingUsers.length > 0 && (
            <span className="text-xs text-muted-foreground italic ml-2 animate-pulse">
              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"}{" "}
              typing...
            </span>
          )}
        </div>

        {/* Pinned Messages Indicator */}
        {pinnedMessages.length > 0 && (
          <Badge
            variant="secondary"
            className="gap-1 bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20"
          >
            <Pin className="h-3 w-3" />
            {pinnedMessages.length} Pinned
          </Badge>
        )}
      </CardHeader>

      {/* Pinned Messages Area (Fixed Top if Any) */}
      {pinnedMessages.length > 0 && (
        <div className="bg-yellow-500/5 border-b border-yellow-500/10 p-2 max-h-[150px] overflow-y-auto">
          <p className="text-xs font-semibold text-yellow-600 mb-2 px-2 flex items-center gap-1">
            <Pin className="h-3 w-3" /> Pinned Messages
          </p>
          <div className="space-y-2 px-2 pb-2">
            {pinnedMessages.map((msg) => (
              <div
                key={msg.id}
                className="text-sm bg-background/80 p-2 rounded border border-yellow-500/20 flex items-start gap-2"
              >
                <div className="w-1 min-w-[4px] h-full bg-yellow-500 rounded-full mr-1" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-xs text-foreground/80">
                      {msg.sender.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(Date.parse(msg.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <p className="text-foreground/90 mt-0.5 max-w-full text-xs">
                    {msg.message}
                  </p>
                  {/* Attachments in Pinned */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex gap-2 mt-1">
                      {msg.attachments.map((file, i) => (
                        <a
                          key={i}
                          href={file}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <Paperclip className="h-3 w-3" /> File
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {/* Unpin Action */}
                {user?.role === "BOSS" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => handlePinMessage(msg.id)}
                  >
                    <PinOff className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {regularMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
            <div className="p-4 rounded-full bg-muted mb-2">
              <Send className="h-8 w-8 text-muted-foreground" />
            </div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}

        {regularMessages.map((msg) => {
          const isSelf = msg.senderId === user?.id;
          return (
            <div
              key={msg.id}
              className={cn(
                "flex items-end gap-2 group",
                isSelf ? "flex-row-reverse" : "flex-row",
              )}
            >
              <Avatar className="h-8 w-8 border border-border/50">
                <AvatarFallback
                  className={cn(
                    "text-xs font-medium",
                    isSelf
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {msg.sender.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div
                className={cn(
                  "flex flex-col max-w-[75%]",
                  isSelf ? "items-end" : "items-start",
                )}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-xs text-muted-foreground font-medium">
                    {msg.sender.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {format(Date.parse(msg.createdAt), "h:mm a")}
                  </span>
                </div>

                <div
                  className={cn(
                    "relative px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                    isSelf
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-muted text-foreground rounded-bl-none border border-border/50",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {msg.message}
                  </p>

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="h-px bg-background/20 w-full mb-2" />
                      {msg.attachments.map((url, index) => {
                        const isImage = url.match(
                          /\.(jpg|jpeg|png|gif|webp)$/i,
                        );
                        return (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-md hover:bg-background/10 transition-colors",
                              isSelf ? "bg-black/10" : "bg-background/50",
                            )}
                          >
                            {isImage ? (
                              <ImageIcon className="h-4 w-4 shrink-0" />
                            ) : (
                              <FileIcon className="h-4 w-4 shrink-0" />
                            )}
                            <span className="truncate max-w-[150px] text-xs underline decoration-dotted">
                              Attachment {index + 1}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Message Actions */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full text-muted-foreground hover:bg-muted/50"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isSelf ? "end" : "start"}>
                    {user?.role === "BOSS" && (
                      <DropdownMenuItem
                        onClick={() => handlePinMessage(msg.id)}
                        className="gap-2 cursor-pointer"
                      >
                        <Pin className="h-4 w-4" /> Pin Message
                      </DropdownMenuItem>
                    )}
                    {(user?.id === msg.senderId || user?.role === "BOSS") && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </CardContent>

      <CardFooter className="p-4 bg-muted/20 border-t min-h-[80px]">
        <form
          onSubmit={handleSendMessage}
          className="flex gap-4 w-full items-end relative"
        >
          {/* File input hidden */}
          <input
            type="file"
            multiple
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Attachment Preview */}
          {selectedFiles.length > 0 && (
            <div className="absolute bottom-full mb-2 left-0 right-0 bg-background border rounded-md p-2 shadow-lg z-10">
              <div className="text-xs font-semibold mb-2 flex items-center justify-between">
                <span>Selected Files ({selectedFiles.length})</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={() => {
                    setSelectedFiles([]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {selectedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="bg-muted p-2 rounded text-xs flex items-center gap-2 whitespace-nowrap border"
                  >
                    <FileIcon className="h-3 w-3" />
                    <span className="max-w-[100px] truncate">{f.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 h-10 w-10 rounded-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </Button>

          <Textarea
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type your message..."
            className="resize-none min-h-[40px] max-h-[120px] py-3 rounded-2xl"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />

          <Button
            type="submit"
            className="shrink-0 h-10 w-10 rounded-full"
            size="icon"
            disabled={!newMessage.trim() && selectedFiles.length === 0}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};
