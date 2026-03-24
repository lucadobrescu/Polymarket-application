import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";

function ForgotPasswordPage() {
  const navigate = useNavigate();

  // ─── State ──────────────────────────────────────────────────────────────────

  const [method, setMethod] = useState<"choose" | "email" | "question">("choose");
  const [step, setStep] = useState<"input" | "answer" | "success" | "email-sent">("input");
  const [email, setEmail] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const inputClass = "w-full bg-[#0f1117] border border-[#2a2d3e] text-white px-4 py-3 text-sm placeholder-[#4a5568] focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50";

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await api.forgotPasswordEmail(email.trim());
      setStep("email-sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchQuestion = async () => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getSecurityQuestion(email.trim());
      setSecurityQuestion(data.securityQuestion);
      setStep("answer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "User not found");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!securityAnswer.trim()) {
      setError("Please enter your security answer");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await api.resetPassword(email, securityAnswer, newPassword);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setMethod("choose");
    setStep("input");
    setError(null);
    setEmail("");
    setSecurityQuestion("");
    setSecurityAnswer("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-indigo-400 font-bold text-2xl tracking-tight">
            📈 PredictMarket
          </div>
          <div className="text-[#94a3b8] text-sm mt-2">
            Account Recovery
          </div>
        </div>

        <div className="border border-[#2a2d3e] bg-[#1a1d2e] p-8">

          {/* Step 0 — Choose method */}
          {method === "choose" && (
            <>
              <div className="text-2xl font-bold text-white mb-1">
                Forgot Password
              </div>
              <div className="text-[#94a3b8] text-sm mb-8">
                Choose how you want to recover your account
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => setMethod("email")}
                  className="w-full border border-[#2a2d3e] hover:border-indigo-500 text-white p-4 text-left transition-colors"
                >
                  <div className="font-semibold text-sm">📧 Reset via Email</div>
                  <div className="text-xs text-[#94a3b8] mt-1">
                    We will send a reset link to your email address
                  </div>
                </button>
                <button
                  onClick={() => setMethod("question")}
                  className="w-full border border-[#2a2d3e] hover:border-indigo-500 text-white p-4 text-left transition-colors"
                >
                  <div className="font-semibold text-sm">🔒 Reset via Security Question</div>
                  <div className="text-xs text-[#94a3b8] mt-1">
                    Answer your security question to reset your password
                  </div>
                </button>
              </div>
            </>
          )}

          {/* Email method — Enter email */}
          {method === "email" && step === "input" && (
            <>
              <div className="text-2xl font-bold text-white mb-1">
                Reset via Email
              </div>
              <div className="text-[#94a3b8] text-sm mb-8">
                Enter your email and we will send you a reset link
              </div>
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                    Email Address
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>
                {error && (
                  <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleSendResetEmail}
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </button>
                <button
                  onClick={reset}
                  className="w-full border border-[#2a2d3e] text-[#94a3b8] hover:text-white py-3 text-sm transition-colors"
                >
                  Back
                </button>
              </div>
            </>
          )}

          {/* Email sent */}
          {method === "email" && step === "email-sent" && (
            <div className="text-center space-y-4">
              <div className="text-4xl">📧</div>
              <div className="text-2xl font-bold text-white">Check your email</div>
              <div className="text-[#94a3b8] text-sm">
                If an account exists for {email}, you will receive a password reset link shortly.
              </div>
              <button
                onClick={() => navigate({ to: "/auth/login" })}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 text-sm font-semibold transition-colors mt-4"
              >
                Back to Login
              </button>
            </div>
          )}

          {/* Security question method — Enter email */}
          {method === "question" && step === "input" && (
            <>
              <div className="text-2xl font-bold text-white mb-1">
                Reset via Security Question
              </div>
              <div className="text-[#94a3b8] text-sm mb-8">
                Enter your email to find your security question
              </div>
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                    Email Address
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>
                {error && (
                  <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleFetchQuestion}
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Looking up..." : "Continue"}
                </button>
                <button
                  onClick={reset}
                  className="w-full border border-[#2a2d3e] text-[#94a3b8] hover:text-white py-3 text-sm transition-colors"
                >
                  Back
                </button>
              </div>
            </>
          )}

          {/* Security question — Answer */}
          {method === "question" && step === "answer" && (
            <>
              <div className="text-2xl font-bold text-white mb-1">
                Security Question
              </div>
              <div className="text-[#94a3b8] text-sm mb-8">
                Answer your security question to reset your password
              </div>
              <div className="space-y-5">
                <div className="border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
                  <div className="text-xs text-[#94a3b8] uppercase tracking-widest mb-1">
                    Your Question
                  </div>
                  <div className="text-white text-sm font-medium">
                    {securityQuestion}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                    Your Answer
                  </div>
                  <input
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Your answer"
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                    New Password
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                    Confirm New Password
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>
                {error && (
                  <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleResetPassword}
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </button>
                <button
                  onClick={() => { setStep("input"); setError(null); }}
                  className="w-full border border-[#2a2d3e] text-[#94a3b8] hover:text-white py-3 text-sm transition-colors"
                >
                  Back
                </button>
              </div>
            </>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="text-center space-y-4">
              <div className="text-4xl">✅</div>
              <div className="text-2xl font-bold text-white">Password Reset</div>
              <div className="text-[#94a3b8] text-sm">
                Your password has been updated successfully.
              </div>
              <button
                onClick={() => navigate({ to: "/auth/login" })}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 text-sm font-semibold transition-colors mt-4"
              >
                Back to Login
              </button>
            </div>
          )}

          {/* Bottom link */}
          {step !== "success" && step !== "email-sent" && (
            <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.875rem", color: "#94a3b8" }}>
              Remember your password?{" "}
              <a href="/auth/login" style={{ color: "#818cf8" }}>Login</a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
});