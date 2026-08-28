import { Layout } from "@/components/layout";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, CheckCheck, Loader2, ShieldCheck, Link as LinkIcon, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  useGetMyAdminMessages,
  useSendAdminReply,
  useMarkMyAdminMessagesRead,
  getGetMyAdminMessagesQueryKey,
} from "@workspace/api-client-react";
import { QueryErrorState } from "@/components/query-error-state";

export default function Messages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading, isError, refetch } = useGetMyAdminMessages({
    query: {
      queryKey: getGetMyAdminMessagesQueryKey(),
      refetchInterval: 5000,
    }
  });

  const sendMutation = useSendAdminReply();
  const markReadMutation = useMarkMyAdminMessagesRead();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as read when unread messages from admin exist
  useEffect(() => {
    if (messages?.some(m => !m.isRead && m.senderIsAdmin)) {
      markReadMutation.mutate(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyAdminMessagesQueryKey() });
        }
      });
    }
  }, [messages, markReadMutation, queryClient]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendMutation.mutate(
      { data: { message: message.trim() } },
      {
        onSuccess: () => {
          setMessage("");
          queryClient.invalidateQueries({ queryKey: getGetMyAdminMessagesQueryKey() });
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Support Options Header */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Customer Support</h1>
            <p className="text-sm text-muted-foreground">
              Chat directly with Realona Exchange administrators.
            </p>
          </div>
          <div className="flex md:justify-end items-center gap-3">
            <a 
              href="https://wa.me/2349160385331" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 px-3 py-2 rounded-md transition-colors dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50"
              data-testid="link-whatsapp-support"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
              </svg>
              WhatsApp Support
            </a>
          </div>
        </div>

        <Card className="flex flex-col border-border bg-card overflow-hidden h-[calc(100vh-220px)] min-h-[500px] shadow-sm">
          {/* Chat Header */}
          <div className="p-4 border-b border-border bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Admin Support</h2>
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Official Realona Support
                </div>
              </div>
            </div>
          </div>

          {/* Security Banner */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 p-3 flex gap-2 items-start text-xs text-amber-800 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              <strong>Security Note:</strong> Admins will never ask for your passwords or to send money outside of Realona Exchange. Report any suspicious behavior.
            </p>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4 bg-background" ref={scrollRef}>
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : isError ? (
              <QueryErrorState
                title="Couldn't load your messages"
                description="Try again to reconnect with Realona support."
                onRetry={() => void refetch()}
              />
            ) : messages?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">How can we help?</h3>
                <p className="text-sm max-w-xs text-center">
                  Send us a message about a trade, deposit, or any issues you're facing. We typically reply within a few hours.
                </p>
              </div>
            ) : (
              <div className="space-y-4 pb-2">
                {messages?.map(msg => {
                  const isMe = !msg.senderIsAdmin;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      {!isMe && (
                        <span className="text-xs font-medium text-muted-foreground ml-1 mb-1">
                          {msg.senderUsername || "Admin"}
                        </span>
                      )}
                      <div 
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          isMe 
                            ? "bg-primary text-primary-foreground rounded-br-sm" 
                            : "bg-muted text-foreground rounded-bl-sm border border-border"
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap break-words">{msg.message}</div>
                        {msg.listingId && (
                          <div className={`mt-3 text-xs p-2.5 rounded-lg border ${isMe ? "bg-primary-foreground/10 border-primary-foreground/20" : "bg-background border-border"}`}>
                            <div className="font-medium flex items-center gap-1.5 mb-1.5">
                              <LinkIcon className="w-3.5 h-3.5" />
                              Referenced Listing
                            </div>
                            <div className="truncate">#{msg.listingId} {msg.listingName ? `- ${msg.listingName}` : ""}</div>
                            <Link href={`/listings/${msg.listingId}`} className={`mt-1.5 inline-block font-medium underline ${isMe ? "text-primary-foreground/90 hover:text-primary-foreground" : "text-primary hover:text-primary/80"}`}>
                              View Listing details
                            </Link>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 px-1">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
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
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                placeholder="Type your message to Admin..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={2000}
                className="flex-1 bg-background h-11"
                disabled={sendMutation.isPending}
                data-testid="input-support-message"
              />
              <Button 
                type="submit" 
                disabled={!message.trim() || sendMutation.isPending}
                className="shrink-0 h-11 px-6 font-semibold"
                data-testid="button-support-send"
              >
                {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Send
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </Layout>
  );
}