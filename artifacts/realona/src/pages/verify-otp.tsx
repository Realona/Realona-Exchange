import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";

const RESEND_COOLDOWN = 60;

export default function VerifyOtp() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const pendingToken = sessionStorage.getItem("pendingToken");
  const pendingEmail = sessionStorage.getItem("pendingEmail");

  useEffect(() => {
    if (!pendingToken) {
      setLocation("/register");
      return;
    }
    // Focus first input
    inputRefs.current[0]?.focus();
  }, [pendingToken, setLocation]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const otpValue = otp.join("");

  const handleChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = cleaned;
    setOtp(next);
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...otp];
    for (let i = 0; i < 6; i++) next[i] = text[i] ?? "";
    setOtp(next);
    const nextEmpty = text.length < 6 ? text.length : 5;
    inputRefs.current[nextEmpty]?.focus();
  };

  const handleVerify = async () => {
    if (otpValue.length !== 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    if (!pendingToken) return;

    setIsVerifying(true);
    try {
      const res = await fetch(`/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken, otp: otpValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }
      sessionStorage.removeItem("pendingToken");
      sessionStorage.removeItem("pendingEmail");
      login(data.token, data.user);
      toast({ title: "Account created!", description: "Welcome to Realona Exchange." });
      setLocation("/dashboard");
    } catch (err: any) {
      toast({ title: "Verification failed", description: err?.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!pendingToken || countdown > 0) return;
    setIsResending(true);
    try {
      const res = await fetch(`/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes("expired") || data.error?.includes("Session")) {
          sessionStorage.removeItem("pendingToken");
          sessionStorage.removeItem("pendingEmail");
          toast({ title: "Session expired", description: "Please register again.", variant: "destructive" });
          setLocation("/register");
          return;
        }
        throw new Error(data.error || "Failed to resend code");
      }
      setOtp(["", "", "", "", "", ""]);
      setCountdown(RESEND_COOLDOWN);
      inputRefs.current[0]?.focus();
      toast({ title: "Code resent!", description: "Check your email for the new code." });
    } catch (err: any) {
      toast({ title: "Failed to resend", description: err?.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex justify-center items-center">
        <Card className="w-full max-w-md border-border bg-card shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Verify your email</CardTitle>
            <CardDescription className="text-muted-foreground">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-foreground">{pendingEmail || "your email"}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OTP inputs */}
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <Input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="w-11 h-12 text-center text-xl font-bold bg-background border-2 focus:border-primary"
                />
              ))}
            </div>

            <Button
              onClick={handleVerify}
              className="w-full"
              disabled={isVerifying || otpValue.length !== 6}
            >
              {isVerifying ? "Verifying..." : "Verify & Create Account"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Didn't receive the code?{" "}
              {countdown > 0 ? (
                <span className="text-muted-foreground">Resend in {countdown}s</span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-primary hover:underline underline-offset-4 disabled:opacity-50"
                >
                  {isResending ? "Sending..." : "Resend code"}
                </button>
              )}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Wrong email?{" "}
              <button
                onClick={() => {
                  sessionStorage.removeItem("pendingToken");
                  sessionStorage.removeItem("pendingEmail");
                  setLocation("/register");
                }}
                className="text-primary hover:underline underline-offset-4"
              >
                Go back
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
