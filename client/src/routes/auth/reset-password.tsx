import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const inputClass = "w-full bg-[#0f1117] border border-[#2a2d3e] text-white px-4 py-3 text-sm placeholder-[#4a5568] focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) {
      setError("Invalid reset link. Please request a new one.");
    } else {
      setToken(t);
    }
  }, []);

  const handleReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);
      await api.resetPasswordWithToken(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate({ to: "/auth/login" }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-indigo-400 font-bold text-2xl tracking-tight">
            📈 PredictMarket
          </div>
          <div className="text-[#94a3b8] text-sm mt-2">
            Reset Password
          </div>
        </div>

        <div className="border border-[#2a2d3e] bg-[#1a1d2e] p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">✅</div>
              <div className="text-2xl font-bold text-white">Password Reset</div>
              <div className="text-[#94a3b8] text-sm">
                Your password has been updated. Redirecting to login...
              </div>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold text-white mb-1">
                Set New Password
              </div>
              <div className="text-[#94a3b8] text-sm mb-8">
                Enter your new password below
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                    New Password
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading || !token}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                    Confirm Password
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading || !token}
                    className={inputClass}
                  />
                </div>

                {error && (
                  <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleReset}
                  disabled={isLoading || !token}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
});