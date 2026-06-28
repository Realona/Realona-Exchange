import { useParams } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  useGetTrade, useGetTradeMessages, useSendTradeMessage,
  useConfirmTradePayment, useSellerTransferred, useConfirmReceipt, useOpenDispute,
} from "@workspace/api-client-react";
import { formatNaira } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Send, AlertTriangle, CheckCircle, ArrowRight, Copy, Eye, EyeOff } from "lucide-react";

function StatusStep({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${active ? "text-primary font-semibold" : done ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs border ${active ? "border-primary bg-primary text-primary-foreground" : done ? "border-green-500 bg-green-500 text-white" : "border-muted-foreground/30"}`}>
        {done ? "✓" : active ? "→" : "·"}
      </div>
      {label}
    </div>
  );
}

const STEPS = [
  { status: "pending", label: "Trade Created" },
  { status: "payment_confirmed", label: "Payment Confirmed" },
  { status: "seller_transferred", label: "Account Transferred" },
  { status: "completed", label: "Trade Complete" },
];

const STATUS_INDEX: Record<string, number> = {
  pending: 0, payment_confirmed: 1, seller_transferred: 2, completed: 3, disputed: 2, refunded: 1,
};

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    payment_confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    seller_transferred: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    completed: "bg-green-500/10 text-green-500 border-green-500/20",
    disputed: "bg-red-500/10 text-red-500 border-red-500/20",
    refunded: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  const label: Record<string, string> = {
    pending: "Awaiting Payment",
    payment_confirmed: "Payment Confirmed",
    seller_transferred: "Account Sent",
    completed: "Completed",
    disputed: "Disputed",
    refunded: "Refunded",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{label[status] ?? status}</Badge>;
}

export default function TradeDetail() {
  const { id } = useParams<{ id: string }>();
  const tradeId = Number(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const { data: trade, isLoading: tradeLoading } = useGetTrade(
    tradeId,
    { query: { queryKey: ["getTrade", tradeId], refetchInterval: 8000 } }
  );
  const { data: messages } = useGetTradeMessages(
    tradeId,
    { query: { queryKey: ["getTradeMessages", tradeId], refetchInterval: 4000 } }
  );

  const sendMsg = useSendTradeMessage();
  const confirmPayment = useConfirmTradePayment();
  const sellerTransfer = useSellerTransferred();
  const confirmReceipt = useConfirmReceipt();
  const openDispute = useOpenDispute();

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["getTrade"] });
    queryClient.invalidateQueries({ queryKey: ["getTrades"] });
    queryClient.invalidateQueries({ queryKey: ["getTradeMessages"] });
    queryClient.invalidateQueries({ queryKey: ["getWalletBalance"] });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMsg.mutate(
      { id: tradeId, data: { message: message.trim() } },
      {
        onSuccess: () => {
          setMessage("");
          queryClient.invalidateQueries({ queryKey: ["getTradeMessages"] });
        },
        onError: (err: any) => toast({ title: "Failed to send", description: err?.data?.error ?? err?.message, variant: "destructive" }),
      }
    );
  };

  const handleConfirmPayment = () => {
    confirmPayment.mutate({ id: tradeId }, {
      onSuccess: () => { toast({ title: "Payment confirmed!", description: "Seller has been notified." }); invalidate(); },
      onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  const handleSellerTransferred = () => {
    sellerTransfer.mutate({ id: tradeId }, {
      onSuccess: () => { toast({ title: "Marked as transferred!", description: "Waiting for buyer to confirm." }); invalidate(); },
      onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  const handleConfirmReceipt = () => {
    confirmReceipt.mutate({ id: tradeId }, {
      onSuccess: () => { toast({ title: "Trade complete! 🎉", description: "Funds released to seller." }); invalidate(); },
      onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  const handleDispute = () => {
    if (!disputeReason.trim()) return;
    openDispute.mutate({ id: tradeId, data: { reason: disputeReason.trim() } }, {
      onSuccess: () => { toast({ title: "Dispute opened", description: "Admin will review shortly." }); setDisputeOpen(false); invalidate(); },
      onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  if (tradeLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="animate-pulse space-y-4 max-w-5xl">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!trade) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Trade Not Found</h2>
        </div>
      </Layout>
    );
  }

  const isBuyer = user?.id === trade.buyerId;
  const isSeller = user?.id === trade.sellerId;
  const currentStep = STATUS_INDEX[trade.status] ?? 0;
  const sellerAmount = trade.amount - (trade.fee ?? 0);
  const isActive = !["completed", "refunded"].includes(trade.status);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Trade #{trade.id}</h1>
            <p className="text-muted-foreground text-sm">{trade.gameName}</p>
          </div>
          {statusBadge(trade.status)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-1 space-y-4">
            {/* Progress */}
            {trade.status !== "disputed" && trade.status !== "refunded" && (
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {STEPS.map((step, i) => (
                    <StatusStep key={step.status} label={step.label} done={i < currentStep} active={i === currentStep} />
                  ))}
                </CardContent>
              </Card>
            )}

            {trade.status === "disputed" && (
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-red-500">Dispute Opened</p>
                      <p className="text-xs text-muted-foreground mt-1">{trade.disputeReason}</p>
                      <p className="text-xs text-muted-foreground mt-2">Admin is reviewing this trade.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trade Info */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Trade Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Buyer</span>
                  <span className="font-medium">{trade.buyerUsername}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seller</span>
                  <span className="font-medium">{trade.sellerUsername}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-primary">{formatNaira(trade.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span className="text-muted-foreground">-{formatNaira(trade.fee ?? 0)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-muted-foreground">Seller Receives</span>
                  <span className="font-bold text-green-500">{formatNaira(sellerAmount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Date</span>
                  <span>{new Date(trade.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {isActive && (
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isBuyer && trade.status === "pending" && (
                    <Button className="w-full" onClick={handleConfirmPayment} disabled={confirmPayment.isPending}>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      {confirmPayment.isPending ? "Processing..." : "Confirm Payment"}
                    </Button>
                  )}

                  {isSeller && trade.status === "payment_confirmed" && (
                    <Button className="w-full" onClick={handleSellerTransferred} disabled={sellerTransfer.isPending}>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      {sellerTransfer.isPending ? "Marking..." : "Mark Account as Sent"}
                    </Button>
                  )}

                  {isBuyer && trade.status === "seller_transferred" && (
                    <div className="space-y-2">
                      <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleConfirmReceipt} disabled={confirmReceipt.isPending}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {confirmReceipt.isPending ? "Completing..." : "Confirm Receipt & Release Funds"}
                      </Button>
                      <Button variant="outline" className="w-full text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={() => setDisputeOpen(true)}>
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Open Dispute
                      </Button>
                    </div>
                  )}

                  {isBuyer && trade.status === "payment_confirmed" && (
                    <Button variant="outline" className="w-full text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={() => setDisputeOpen(true)}>
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Open Dispute
                    </Button>
                  )}

                  {isSeller && ["pending"].includes(trade.status) && (
                    <p className="text-xs text-muted-foreground text-center">Waiting for buyer to confirm payment.</p>
                  )}
                  {isSeller && trade.status === "seller_transferred" && (
                    <p className="text-xs text-muted-foreground text-center">Waiting for buyer to confirm receipt.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Credentials (visible to buyer after payment confirmed) */}
            {isBuyer && ["payment_confirmed", "seller_transferred", "completed"].includes(trade.status) && (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-green-500 uppercase tracking-wider">Account Credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-xs text-muted-foreground">These credentials are provided by the seller. Verify access before confirming receipt.</p>
                  <p className="text-xs text-muted-foreground italic">Contact seller via chat for credentials if not listed in the trade description.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Chat */}
          <div className="lg:col-span-2 flex flex-col">
            <Card className="border-border bg-card flex flex-col flex-1" style={{ minHeight: "500px" }}>
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base">Trade Chat</CardTitle>
                <p className="text-xs text-muted-foreground">Chat is visible only to buyer, seller, and admins.</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]">
                  {!messages || messages.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Start the conversation!</p>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.senderId === user?.id;
                      const isSystem = msg.isSystem;
                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center">
                            <span className="bg-muted text-muted-foreground text-xs px-3 py-1.5 rounded-full border border-border">
                              🤖 {msg.message}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                            {!isMe && <p className="text-xs font-semibold mb-1 opacity-70">{msg.senderUsername}</p>}
                            <p className="text-sm leading-relaxed">{msg.message}</p>
                            <p className={`text-xs mt-1 ${isMe ? "text-primary-foreground/70 text-right" : "text-muted-foreground"}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input */}
                {isActive && (
                  <div className="border-t border-border p-3">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="bg-background flex-1"
                        disabled={sendMsg.isPending}
                      />
                      <Button type="submit" size="icon" disabled={sendMsg.isPending || !message.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dispute Dialog */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-red-500">Open a Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Explain the issue. An admin will review the trade and make a decision.</p>
            <Textarea
              placeholder="Describe what went wrong..."
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              className="bg-background min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDispute}
              disabled={openDispute.isPending || !disputeReason.trim()}
            >
              {openDispute.isPending ? "Submitting..." : "Submit Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
