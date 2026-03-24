import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

function VerifyEmailPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

 useEffect(() => {
  const token = new URLSearchParams(window.location.search).get("token");

  if (!token) {
    setStatus("error");
    setError("No verification token found");
    return;
  }

  fetch(`http://localhost:4001/api/auth/verify-email?token=${token}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        setStatus("success");
        setTimeout(() => {
          window.location.href = "/auth/login?verified=true";
        }, 2000);
      } else {
        setStatus("error");
        setError(data.message || "Verification failed");
      }
    })
    .catch(() => {
      setStatus("error");
      setError("Verification failed");
    });
}, []);

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
  <div className="w-full max-w-md">
    <div className="text-center mb-8">
      <div className="text-indigo-400 font-bold text-2xl tracking-tight">
        📈 PredictMarket
      </div>
    </div>
    <div className="border border-[#2a2d3e] bg-[#1a1d2e] p-8 text-center space-y-4">

      {status === "loading" && (
        <>
          <div className="text-4xl">⏳</div>
          <div className="text-xl font-bold text-white">Verifying your email...</div>
          <div className="text-[#94a3b8] text-sm">Please wait</div>
        </>
      )}

      {status === "success" && (
        <>
          <div className="text-4xl">✅</div>
          <div className="text-xl font-bold text-white">Email Verified!</div>
          <div className="text-[#94a3b8] text-sm">
            Your account is now active. Redirecting to login...
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <div className="text-4xl">❌</div>
          <div className="text-xl font-bold text-white">Verification Failed</div>
          <div className="text-red-400 text-sm">{error}</div>
          <button
            onClick={() => navigate({ to: "/auth/login" })}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 text-sm font-semibold transition-colors mt-4"
          >
            Back to Login
          </button>
        </>
      )}

    </div>
  </div>
</div>
  );
}

export const Route = createFileRoute("/auth/verify-email")({
  component: VerifyEmailPage,
});