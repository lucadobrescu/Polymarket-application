import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api, Market } from "@/lib/api";

type SortBy = "date" | "totalBets" | "participants";
type SortOrder = "asc" | "desc";

function MarketCard({ market, onClick }: { market: Market; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-[#1a1d2e] border border-[#2a2d3e] p-5 cursor-pointer hover:border-indigo-500 hover:bg-[#1e2138] transition-all duration-150 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 ${
          market.status === "active"
            ? "text-green-400 bg-green-400/10"
            : "text-gray-400 bg-gray-400/10"
        }`}>
          {market.status}
        </span>
        <span className="text-xs text-[#94a3b8]">
          Vol: <span className="text-white font-mono">{market.totalMarketBets.toFixed(0)}</span> tokens
        </span>
      </div>

      <h3 className="text-white font-semibold text-base leading-snug mb-4 line-clamp-2">
        {market.title}
      </h3>

      <div className="space-y-2 flex-1">
        {market.outcomes.map((outcome) => (
          <div key={outcome.id} className="flex items-center justify-between">
            <span className="text-[#94a3b8] text-sm truncate flex-1 mr-2">
              {outcome.title}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-[#2a2d3e]">
                <div
                  className="h-full bg-indigo-500"
                  style={{ width: `${outcome.odds}%` }}
                />
              </div>
              <span className="text-white font-mono text-sm w-12 text-right">
                {outcome.odds}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#2a2d3e]">
        <span className="text-xs text-[#94a3b8]">
          {market.participants} participant{market.participants !== 1 ? "s" : ""}
        </span>
        <span className="text-xs text-indigo-400 font-medium">View →</span>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"active" | "resolved">("active");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const limit = 20;

  const loadMarkets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.listMarkets(status, page, limit, sortBy, sortOrder);
      setMarkets(data.markets ?? []);
      setHasMore(data.hasMore ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load markets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMarkets();
    const interval = setInterval(() => loadMarkets(), 30000);
    return () => clearInterval(interval);
  }, [status, page, sortBy, sortOrder]);

  const handleStatusChange = (newStatus: "active" | "resolved") => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleSortChange = (newSortBy: SortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
    setPage(1);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-indigo-400 text-5xl mb-6">📈</div>
          <h1 className="text-5xl font-bold mb-4 text-white tracking-tight">
            Prediction Markets
          </h1>
          <p className="text-[#94a3b8] mb-8 text-lg">
            Trade on the outcomes of real world events. Create markets, place bets, earn rewards.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate({ to: "/auth/login" })}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 font-semibold transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => navigate({ to: "/auth/register" })}
              className="border border-[#2a2d3e] hover:border-indigo-500 text-white px-6 py-3 font-semibold transition-colors"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <div className="border-b border-[#2a2d3e] bg-[#0f1117] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-indigo-400 font-bold text-lg tracking-tight">
              📈 PredictMarket
            </span>
            <nav className="flex items-center gap-6 text-sm">
              <span className="text-white font-medium border-b-2 border-indigo-500 pb-0.5">
                Markets
              </span>
              <button
                onClick={() => navigate({ to: "/leaderboard" })}
                className="text-[#94a3b8] hover:text-white transition-colors"
              >
                Leaderboard
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-[#94a3b8]">{user?.username}</p>
              <p className="text-sm font-mono font-bold text-green-400">
                {user?.balance !== undefined
                  ? `${user.balance.toFixed(2)} tokens`
                  : "—"}
              </p>
            </div>
            <div className="w-px h-8 bg-[#2a2d3e]" />
            <button
              onClick={() => navigate({ to: "/profile" })}
              className="text-sm text-[#94a3b8] hover:text-white transition-colors"
            >
              Profile
            </button>
            <button
              onClick={() => navigate({ to: "/markets/new" })}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 font-semibold transition-colors"
            >
              + Create Market
            </button>
            <button
              onClick={() => navigate({ to: "/auth/logout" })}
              className="text-sm text-[#94a3b8] hover:text-red-400 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Markets</h1>
            <p className="text-[#94a3b8] text-sm mt-1">
              {isLoading ? "Loading..." : `${markets.length} markets shown`}
            </p>
          </div>
          <button
            onClick={loadMarkets}
            disabled={isLoading}
            className="text-xs text-[#94a3b8] hover:text-white border border-[#2a2d3e] px-3 py-2 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        <div className="flex items-center justify-between mb-6 border-b border-[#2a2d3e] pb-4">
          <div className="flex items-center gap-1">
            {(["active", "resolved"] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  status === s
                    ? "bg-indigo-600 text-white"
                    : "text-[#94a3b8] hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#94a3b8] mr-1">Sort:</span>
            {([
              { key: "date", label: "Date" },
              { key: "totalBets", label: "Volume" },
              { key: "participants", label: "Participants" },
            ] as { key: SortBy; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSortChange(key)}
                className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                  sortBy === key
                    ? "border-indigo-500 text-indigo-400 bg-indigo-500/10"
                    : "border-[#2a2d3e] text-[#94a3b8] hover:border-[#94a3b8] hover:text-white"
                }`}
              >
                {label} {sortBy === key ? (sortOrder === "desc" ? "↓" : "↑") : ""}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-6">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-[#1a1d2e] border border-[#2a2d3e] p-5 h-48 animate-pulse"
              />
            ))}
          </div>
        ) : markets.length === 0 ? (
          <div className="border border-[#2a2d3e] py-24 text-center">
            <p className="text-[#94a3b8] text-lg">No {status} markets found.</p>
            {status === "active" && (
              <button
                onClick={() => navigate({ to: "/markets/new" })}
                className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm underline"
              >
                Create the first one
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {markets.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  onClick={() =>
                    navigate({
                      to: "/markets/$id",
                      params: { id: String(market.id) },
                    })
                  }
                />
              ))}
            </div>

            <div className="flex items-center justify-between mt-8 border-t border-[#2a2d3e] pt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="border border-[#2a2d3e] text-[#94a3b8] hover:text-white hover:border-[#94a3b8] px-4 py-2 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="text-sm text-[#94a3b8] font-mono">
                Page {page}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore || isLoading}
                className="border border-[#2a2d3e] text-[#94a3b8] hover:text-white hover:border-[#94a3b8] px-4 py-2 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: DashboardPage,
});