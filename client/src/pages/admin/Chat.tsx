import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, User } from "lucide-react";
import { toast } from "sonner";

export default function AdminChat() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: conversations, isLoading: loadingConversations } =
    trpc.chat.getAllConversations.useQuery(undefined, {
      refetchInterval: 5000, // Poll every 5 seconds
    });

  const { data: messages, isLoading: loadingMessages } =
    trpc.chat.getUserMessages.useQuery(
      { userId: selectedUserId! },
      {
        enabled: !!selectedUserId,
        refetchInterval: 3000,
      }
    );

  const sendReplyMutation = trpc.chat.sendAdminReply.useMutation({
    onSuccess: () => {
      setMessage("");
      utils.chat.getUserMessages.invalidate();
      utils.chat.getAllConversations.invalidate();
      scrollToBottom();
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  const markAsReadMutation = trpc.chat.markAsRead.useMutation({
    onSuccess: () => {
      utils.chat.getAllConversations.invalidate();
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (selectedUserId) {
      markAsReadMutation.mutate({ userId: selectedUserId });
    }
  }, [selectedUserId]);

  const handleSend = () => {
    if (!message.trim() || !selectedUserId) return;
    sendReplyMutation.mutate({
      userId: selectedUserId,
      message: message.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedConversation = conversations?.find(
    (c: any) => c.userId === selectedUserId
  );

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Customer Support Chat</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <Card className="md:col-span-1 overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {loadingConversations ? (
              <p className="text-center text-sm text-muted-foreground p-4">
                Loading conversations...
              </p>
            ) : conversations && conversations.length > 0 ? (
              <div className="divide-y">
                {conversations.map((conv: any) => (
                  <button
                    key={conv.userId}
                    onClick={() => setSelectedUserId(conv.userId)}
                    className={`w-full p-4 text-left hover:bg-muted transition-colors ${
                      selectedUserId === conv.userId ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {conv.userName || "Unknown User"}
                        </span>
                      </div>
                      {conv.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {conv.userEmail}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(conv.lastMessageTime).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center p-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No conversations yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Window */}
        <Card className="md:col-span-2 overflow-hidden flex flex-col">
          {selectedUserId ? (
            <>
              <CardHeader className="border-b">
                <div>
                  <CardTitle className="text-lg">
                    {selectedConversation?.userName || "Unknown User"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation?.userEmail}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <p className="text-center text-sm text-muted-foreground">
                    Loading messages...
                  </p>
                ) : messages && messages.length > 0 ? (
                  messages.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.senderType === "admin"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-2 ${
                          msg.senderType === "admin"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.message}
                        </p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.senderType === "admin"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No messages yet</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              <div className="border-t p-3">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your reply..."
                    className="flex-1"
                    disabled={sendReplyMutation.isPending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim() || sendReplyMutation.isPending}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Select a conversation to start chatting
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
