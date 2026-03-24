import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api, ActiveBet, ResolvedBet } from "@/lib/api";

// ─── Component ────────────────────────────────────────────────────────────────

function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // ─── State ──────────────────────────────────────────────────────────────────

  const [activeBets, setActiveBets] = useState<ActiveBet[]>([]);
  const [resolvedBets, setResolvedBets] = useState<ResolvedBet[]>([]);
  const [activeHasMore, setActiveHasMore] = useState(false);
  const [resolvedHasMore, setResolvedHasMore] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [resolvedPage, setResolvedPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── API Key State ───────────────────────────────────────────────────────────

  const [hasApiKey, setHasApiKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getProfile(activePage, resolvedPage);
      setActiveBets(data.activeBets.data);
      setActiveHasMore(data.activeBets.hasMore);
      setResolvedBets(data.resolvedBets.data);
      setResolvedHasMore(data.resolvedBets.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const loadApiKeyStatus = async () => {
    try {
      const data = await api.getApiKeyStatus();
      setHasApiKey(data.hasApiKey);
    } catch {
      // silently fail
    }
  };

  const handleGenerateApiKey = async () => {
    try {
      setIsGenerating(true);
      setApiKeyError(null);
      setGeneratedKey(null);
      const data = await api.generateApiKey();
      setGeneratedKey(data.apiKey);
      setHasApiKey(true);
    } catch (err) {
      setApiKeyError(
        err instanceof Error ? err.message : "Failed to generate API key"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
      loadApiKeyStatus();
    }
  }, [activePage, resolvedPage, isAuthenticated]);

  // ─── Unauthenticated View ───────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-[#94a3b8]">Please log in to view your profile</p>
          <button
            onClick={() => navigate({ to: "/auth/login" })}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 text-sm font-semibold transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  // ─── Authenticated View ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">

      {/* Navbar */}
      <div className="border-b border-[#2a2d3e] sticky top-0 z-10 bg-[#0f1117]">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-[#94a3b8] hover:text-white text-sm transition-colors"
          >
            ← Back to Markets
          </button>
          <span className="text-indigo-400 font-bold tracking-tight">
            📈 PredictMarket
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* User Info */}
        <div className="border border-[#2a2d3e] bg-[#1a1d2e] p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {user?.username}
              </h1>
              <p className="text-[#94a3b8] text-sm mt-1">{user?.email}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-1">
                Balance
              </p>
              <p className="text-3xl font-mono font-bold text-green-400">
                {user?.balance?.toFixed(2)}
              </p>
              <p className="text-xs text-[#94a3b8]">tokens</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* API Key */}
        <div className="border border-[#2a2d3e] bg-[#1a1d2e] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">API Key</h2>
            {hasApiKey && !generatedKey && (
              <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1">
                ACTIVE
              </span>
            )}
          </div>

          <p className="text-sm text-[#94a3b8]">
            Use your API key to place bets programmatically via the{" "}
            <code className="bg-[#0f1117] text-indigo-400 px-1.5 py-0.5 text-xs">
              x-api-key
            </code>{" "}
            header. Keys are hashed and stored securely — shown only once.
          </p>

          {/* Generated key display */}
          {generatedKey && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-[#0f1117] border border-green-500/30">
                <code className="flex-1 text-sm font-mono text-green-400 break-all">
                  {generatedKey}
                </code>
                <button
                  onClick={handleCopyKey}
                  className="text-xs border border-[#2a2d3e] hover:border-indigo-500 text-[#94a3b8] hover:text-white px-3 py-1.5 transition-colors shrink-0"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-amber-400">
                ⚠️ Save this key now — it will never be shown again.
              </p>
            </div>
          )}

          {apiKeyError && (
            <p className="text-sm text-red-400">{apiKeyError}</p>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={handleGenerateApiKey}
              disabled={isGenerating}
              className={`text-sm px-4 py-2 font-semibold transition-colors disabled:opacity-50 ${
                hasApiKey
                  ? "border border-[#2a2d3e] text-[#94a3b8] hover:text-white hover:border-[#94a3b8]"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              {isGenerating
                ? "Generating..."
                : hasApiKey
                ? "Regenerate Key"
                : "Generate API Key"}
            </button>
            {hasApiKey && !generatedKey && (
              <p className="text-xs text-[#94a3b8]">
                Regenerating will invalidate your existing key.
              </p>
            )}
          </div>
        </div>

        {/* Active Bets */}
        <div className="border border-[#2a2d3e] bg-[#1a1d2e]">
          <div className="px-6 py-4 border-b border-[#2a2d3e] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Active Bets</h2>
            <span className="text-xs text-[#94a3b8] font-mono">
              {activeBets.length} bet{activeBets.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-[#0f1117] border border-[#2a2d3e] animate-pulse"
                  />
                ))}
              </div>
            ) : activeBets.length === 0 ? (
              <p className="text-[#94a3b8] text-center py-8">
                No active bets yet.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {activeBets.map((bet) => (
                    <div
                      key={bet.betId}
                      className="flex items-center justify-between p-4 border border-[#2a2d3e] hover:border-indigo-500/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-semibold text-white cursor-pointer hover:text-indigo-400 transition-colors truncate"
                          onClick={() =>
                            navigate({
                              to: "/markets/$id",
                              params: { id: String(bet.marketId) },
                            })
                          }
                        >
                          {bet.marketTitle}
                        </p>
                        <p className="text-xs text-[#94a3b8] mt-0.5">
                          {bet.outcomeTitle} ·{" "}
                          <span className="font-mono">{bet.amount.toFixed(2)}</span> tokens
                        </p>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <p className="text-2xl font-mono font-bold text-indigo-400">
                          {bet.odds}%
                        </p>
                        <p className="text-xs text-[#94a3b8]">odds</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2a2d3e]">
                  <button
                    onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                    disabled={activePage === 1 || isLoading}
                    className="text-xs border border-[#2a2d3e] text-[#94a3b8] hover:text-white px-3 py-1.5 transition-colors disabled:opacity-30"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs text-[#94a3b8] font-mono">
                    Page {activePage}
                  </span>
                  <button
                    onClick={() => setActivePage((p) => p + 1)}
                    disabled={!activeHasMore || isLoading}
                    className="text-xs border border-[#2a2d3e] text-[#94a3b8] hover:text-white px-3 py-1.5 transition-colors disabled:opacity-30"
                  >
                    Next →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Resolved Bets */}
        <div className="border border-[#2a2d3e] bg-[#1a1d2e]">
          <div className="px-6 py-4 border-b border-[#2a2d3e] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Resolved Bets</h2>
            <span className="text-xs text-[#94a3b8] font-mono">
              {resolvedBets.length} bet{resolvedBets.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-[#0f1117] border border-[#2a2d3e] animate-pulse"
                  />
                ))}
              </div>
            ) : resolvedBets.length === 0 ? (
              <p className="text-[#94a3b8] text-center py-8">
                No resolved bets yet.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {resolvedBets.map((bet) => (
                    <div
                      key={bet.betId}
                      className="flex items-center justify-between p-4 border border-[#2a2d3e] hover:border-indigo-500/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-semibold text-white cursor-pointer hover:text-indigo-400 transition-colors truncate"
                          onClick={() =>
                            navigate({
                              to: "/markets/$id",
                              params: { id: String(bet.marketId) },
                            })
                          }
                        >
                          {bet.marketTitle}
                        </p>
                        <p className="text-xs text-[#94a3b8] mt-0.5">
                          {bet.outcomeTitle} ·{" "}
                          <span className="font-mono">{bet.amount.toFixed(2)}</span> tokens
                        </p>
                      </div>
                      <div className="ml-4 shrink-0">
                        <span
                          className={`text-xs font-bold px-3 py-1.5 ${
                            bet.won
                              ? "bg-green-400/10 text-green-400"
                              : "bg-red-400/10 text-red-400"
                          }`}
                        >
                          {bet.won ? "WON" : "LOST"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2a2d3e]">
                  <button
                    onClick={() => setResolvedPage((p) => Math.max(1, p - 1))}
                    disabled={resolvedPage === 1 || isLoading}
                    className="text-xs border border-[#2a2d3e] text-[#94a3b8] hover:text-white px-3 py-1.5 transition-colors disabled:opacity-30"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs text-[#94a3b8] font-mono">
                    Page {resolvedPage}
                  </span>
                  <button
                    onClick={() => setResolvedPage((p) => p + 1)}
                    disabled={!resolvedHasMore || isLoading}
                    className="text-xs border border-[#2a2d3e] text-[#94a3b8] hover:text-white px-3 py-1.5 transition-colors disabled:opacity-30"
                  >
                    Next →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});