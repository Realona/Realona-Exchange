import { Layout } from "@/components/layout";
import { AdminNav } from "./users";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Send, CheckCheck, Loader2, MessageCircle, Link as LinkIcon, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { QueryErrorState } from "@/components/query-error-state";
import {
  useGetAdminChatUsers,
  useGetAdminChatMessages,
  useSendAdminChatMessage,
  useMarkAdminChatRead,
  getGetAdminChatMessagesQueryKey,
  getGetAdminChatUsersQueryKey,
} from "@workspace/api-client-react";

export default function AdminChat() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [listingId, setListingId] = useState<string>("");
  const [showListingInput, setShowListingInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [, setLocation] = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(() => {
    const value = new URLSearchParams(window.location.search).get("userId");
    const id = value ? Number(value) : null;
    return id && Number.isInteger(id) && id > 0 ? id : null;
  });

  const usersParams = { search: search || undefined };
  const {
    data: users,
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useGetAdminChatUsers(usersParams, {
    query: {
      queryKey: getGetAdminChatUsersQueryKey(usersParams),
      refetchInterval: 5000,
    },
  });
  
  const {
    data: messages,
    isLoading: messagesLoading,
    isError: messagesError,
    refetch: refetchMessages,
  } = useGetAdminChatMessages(selectedUserId!, {
    query: {
      enabled: !!selectedUserId,
      queryKey: getGetAdminChatMessagesQueryKey(selectedUserId!),
      refetchInterval: 5000,
    }
  });

  const sendMutation = useSendAdminChatMessage();
  const markReadMutation = useMarkAdminChatRead();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as read when messages load and there are unread messages from the user
  useEffect(() => {
    if (selectedUserId && messages?.some(m => !m.isRead && !m.senderIsAdmin)) {
      markReadMutation.mutate({ id: selectedUserId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAdminChatUsersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminChatMessagesQueryKey(selectedUserId) });
        }
      });
    }
  }, [selectedUserId, messages, markReadMutation, queryClient]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedUserId) return;

    const parsedListingId = listingId ? parseInt(listingId, 10) : undefined;
    if (listingId && isNaN(parsedListingId!)) {
      toast({ title: "Invalid Listing ID", description: "Listing ID must be a number", variant: "destructive" });
      return;
    }

    sendMutation.mutate(
      { 
        id: selectedUserId, 
        data: { 
          message: message.trim(),
          listingId: parsedListingId
        } 
      },
      {
        onSuccess: () => {
          setMessage("");
          setListingId("");
          setShowListingInput(false);
          queryClient.invalidateQueries({ queryKey: getGetAdminChatMessagesQueryKey(selectedUserId) });
          queryClient.invalidateQueries({ queryKey: getGetAdminChatUsersQueryKey() });
        },
        onError: (err: any) => {
          toast({ 
            title: "Failed to send message", 
            description: err?.data?.error ?? err?.message, 
            variant: "destructive" 
          });
        }
      }
    );
  };

  const selectedUser = users?.find(u => u.id === selectedUserId);

  return (
    <Layout>
      <AdminNav />
      <div className="container mx-auto px-4 pb-8">
        <h1 className="text-2xl font-bold mb-6">User Support Chat</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-280px)] min-h-[500px]">
          {/* Users List (Sidebar) */}
          <Card className="flex flex-col border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 bg-background"
                  data-testid="input-chat-user-search"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              {usersLoading ? (
                <div className="p-4 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : usersError ? (
                <div className="p-4">
                  <QueryErrorState
                    title="Couldn't load users"
                    description="Try again to load available conversations."
                    onRetry={() => void refetchUsers()}
                  />
                </div>
              ) : users?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No users found</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {users?.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setLocation(`/admin/chat?userId=${u.id}`);
                      }}
                      className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${selectedUserId === u.id ? "bg-muted" : ""}`}
                      data-testid={`button-chat-user-${u.id}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold truncate pr-2">{u.username}</span>
                        {u.unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                            {u.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span className="truncate pr-2">{u.email}</span>
                        {u.lastMessageAt && (
                          <span className="shrink-0 whitespace-nowrap">
                            {new Date(u.lastMessageAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {u.lastMessage && (
                        <p className="text-xs text-muted-foreground mt-1.5 truncate">
                          {u.lastMessage}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-2 flex flex-col border-border bg-card overflow-hidden">
            {selectedUserId ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedUser?.username || `User #${selectedUserId}`}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
                  </div>
                </div>

                {/* Chat Messages */}
                <ScrollArea className="flex-1 p-4 bg-slate-50/50 dark:bg-slate-900/20" ref={scrollRef}>
                  {messagesLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : messagesError ? (
                    <QueryErrorState
                      title="Couldn't load this conversation"
                      description="Try again to retrieve the message history."
                      onRetry={() => void refetchMessages()}
                    />
                  ) : messages?.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                      <MessageCircle className="w-12 h-12 mb-3" />
                      <p>No messages yet. Send a message to start the conversation.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages?.map(msg => {
                        const isAdmin = msg.senderIsAdmin;
                        return (
                          <div key={msg.id} className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                            <div 
                              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                isAdmin 
                                  ? "bg-primary text-primary-foreground rounded-br-sm" 
                                  : "bg-white border border-border text-foreground rounded-bl-sm dark:bg-slate-800"
                              }`}
                            >
                              <div className="text-sm whitespace-pre-wrap break-words">{msg.message}</div>
                              {msg.listingId && (
                                <div className={`mt-2 text-xs p-2 rounded border ${isAdmin ? "bg-primary-foreground/10 border-primary-foreground/20" : "bg-muted border-border"}`}>
                                  <div className="font-medium flex items-center gap-1.5 mb-1">
                                    <LinkIcon className="w-3 h-3" />
                                    Attached Listing
                                  </div>
                                  <div>#{msg.listingId} {msg.listingName ? `- ${msg.listingName}` : ""}</div>
                                  <Link href={`/listings/${msg.listingId}`} className={`mt-1 inline-block underline ${isAdmin ? "text-primary-foreground/80 hover:text-primary-foreground" : "text-primary hover:text-primary/80"}`}>
                                    View Listing
                                  </Link>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 px-1">
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isAdmin && (
                                <CheckCheck className={`w-3 h-3 ${msg.isRead ? "text-blue-500" : "text-muted-foreground"}`} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-3 border-t border-border bg-card">
                  {showListingInput && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-md border border-border text-sm relative">
                      <LinkIcon className="w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="number"
                        min={1}
                        placeholder="Attach Listing ID (optional)" 
                        value={listingId}
                        onChange={e => setListingId(e.target.value)}
                        className="h-8 bg-background border-border flex-1"
                        data-testid="input-chat-listing-id"
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setListingId(""); setShowListingInput(false); }}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  <form onSubmit={handleSend} className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      className={`shrink-0 ${showListingInput ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                      onClick={() => setShowListingInput(!showListingInput)}
                      title="Attach Listing"
                      data-testid="button-chat-attach-listing"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </Button>
                    <Input
                      placeholder="Type your message..."
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      maxLength={2000}
                      className="flex-1 bg-background"
                      disabled={sendMutation.isPending}
                      data-testid="input-chat-message"
                    />
                    <Button 
                      type="submit" 
                      disabled={!message.trim() || sendMutation.isPending}
                      className="shrink-0"
                      data-testid="button-chat-send"
                    >
                      {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                <MessageCircle className="w-16 h-16 mb-4" />
                <p className="text-lg">Select a user to start messaging</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}