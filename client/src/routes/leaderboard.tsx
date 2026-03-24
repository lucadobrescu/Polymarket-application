import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api, LeaderboardEntry } from "@/lib/api";

// ─── Component ────────────────────────────────────────────────────────────────

function LeaderboardPage() {
  const navigate = useNavigate();

  // ─── State ──────────────────────────────────────────────────────────────────

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getLeaderboard(page);
      setEntries(data.data);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, [page]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { label: "1", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" };
    if (rank === 2) return { label: "2", color: "text-gray-300", bg: "bg-gray-400/10 border-gray-400/30" };
    if (rank === 3) return { label: "3", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30" };
    return { label: String(rank), color: "text-[#94a3b8]", bg: "bg-transparent border-[#2a2d3e]" };
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">

      {/* Navbar */}
      <div className="border-b border-[#2a2d3e] sticky top-0 z-10 bg-[#0f1117]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
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

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Leaderboard
          </h1>
          <p className="text-[#94a3b8] text-sm mt-1">
            Ranked by balance. Starting balance was 1000 tokens.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="border border-[#2a2d3e] bg-[#1a1d2e]">

          {/* Table Header */}
          <div className="grid grid-cols-12 px-6 py-3 border-b border-[#2a2d3e] text-xs text-[#94a3b8] uppercase tracking-widest">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5">User</div>
            <div className="col-span-3 text-right">Balance</div>
            <div className="col-span-3 text-right">Earnings</div>
          </div>

          {/* Rows */}
          {isLoading ? (
            <div className="divide-y divide-[#2a2d3e]">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse bg-[#1a1d2e] border-b border-[#2a2d3e]"
                />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-[#94a3b8]">No users yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#2a2d3e]">
              {entries.map((entry) => {
                const rank = getRankDisplay(entry.rank);
                return (
                  <div
                    key={entry.rank}
                    className={`grid grid-cols-12 px-6 py-4 items-center hover:bg-[#1e2138] transition-colors ${
                      entry.rank <= 3 ? "bg-[#1e2138]/50" : ""
                    }`}
                  >
                    {/* Rank */}
                    <div className="col-span-1">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 text-sm font-bold border ${rank.bg} ${rank.color}`}
                      >
                        {rank.label}
                      </span>
                    </div>

                    {/* Username */}
                    <div className="col-span-5">
                      <p className={`font-semibold ${entry.rank <= 3 ? "text-white" : "text-[#94a3b8]"}`}>
                        {entry.username}
                      </p>
                    </div>

                    {/* Balance */}
                    <div className="col-span-3 text-right">
                      <p className="font-mono text-white text-sm">
                        {entry.balance.toFixed(2)}
                      </p>
                      <p className="text-xs text-[#94a3b8]">tokens</p>
                    </div>

                    {/* Earnings */}
                    <div className="col-span-3 text-right">
                      <p className={`font-mono font-bold text-sm ${
                        entry.earnings >= 0 ? "text-green-400" : "text-red-400"
                      }`}>
                        {entry.earnings >= 0 ? "+" : ""}
                        {entry.earnings.toFixed(2)}
                      </p>
                      <p className="text-xs text-[#94a3b8]">earnings</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && entries.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2a2d3e]">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="text-xs border border-[#2a2d3e] text-[#94a3b8] hover:text-white px-3 py-1.5 transition-colors disabled:opacity-30"
              >
                ← Previous
              </button>
              <span className="text-xs text-[#94a3b8] font-mono">Page {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore || isLoading}
                className="text-xs border border-[#2a2d3e] text-[#94a3b8] hover:text-white px-3 py-1.5 transition-colors disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
});