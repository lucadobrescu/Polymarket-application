import { useEffect, useState } from "react";
import { useParams, useNavigate, createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api, Market } from "@/lib/api";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

// ─── Resolve Panel (Admin Only) ───────────────────────────────────────────────

function ResolveMarketPanel({
  market,
  onResolved,
}: {
  market: Market;
  onResolved: () => void;
}) {
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<number | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResolve = async () => {
    if (!selectedOutcomeId) return;
    try {
      setIsResolving(true);
      setError(null);
      await api.resolveMarket(market.id, selectedOutcomeId);
      setSuccess(true);
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve market");
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
      <div className="text-sm font-bold text-amber-400 uppercase tracking-widest">
        Admin — Resolve Market
      </div>

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          Market resolved and payouts distributed!
        </div>
      )}

      <div className="text-xs text-[#94a3b8] uppercase tracking-widest mb-2">
        Select winning outcome
      </div>

      <div className="space-y-2">
        {market.outcomes.map((outcome) => (
          <div
            key={outcome.id}
            onClick={() => setSelectedOutcomeId(outcome.id)}
            className={`p-3 border cursor-pointer transition-colors text-sm ${
              selectedOutcomeId === outcome.id
                ? "border-amber-500 bg-amber-500/10 text-amber-400"
                : "border-[#2a2d3e] text-[#94a3b8] hover:border-amber-500/50 hover:text-white"
            }`}
          >
            {outcome.title}
          </div>
        ))}
      </div>

      <button
        onClick={handleResolve}
        disabled={isResolving || !selectedOutcomeId || success}
        className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isResolving ? "Resolving..." : "Resolve Market"}
      </button>
    </div>
  );
}

// ─── Market Detail Page ───────────────────────────────────────────────────────

function MarketDetailPage() {
  const { id } = useParams({ from: "/markets/$id" });
  const navigate = useNavigate();
  const { isAuthenticated, user, refreshBalance } = useAuth();

  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [isBetting, setIsBetting] = useState(false);

  const marketId = parseInt(id, 10);

  useEffect(() => {
    const loadMarket = async () => {
      try {
        setIsLoading(true);
        const data = await api.getMarket(marketId);
        setMarket(data);
        if (data.outcomes.length > 0) {
          setSelectedOutcomeId(data.outcomes[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load market details");
      } finally {
        setIsLoading(false);
      }
    };
    loadMarket();
    const interval = setInterval(() => {
      api.getMarket(marketId).then(setMarket).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [marketId]);

  const handlePlaceBet = async () => {
    if (!selectedOutcomeId || !betAmount) {
      setError("Please select an outcome and enter a bet amount");
      return;
    }
    try {
      setIsBetting(true);
      setError(null);
      await api.placeBet(marketId, selectedOutcomeId, parseFloat(betAmount));
      setBetAmount("");
      const updated = await api.getMarket(marketId);
      setMarket(updated);
      await refreshBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place bet");
    } finally {
      setIsBetting(false);
    }
  };

  // ─── States ────────────────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-[#94a3b8]">Please log in to view this market</div>
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-[#94a3b8] text-sm">Loading market...</div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-400">Market not found</div>
          <button
            onClick={() => navigate({ to: "/" })}
            className="border border-[#2a2d3e] text-[#94a3b8] hover:text-white px-6 py-2 text-sm transition-colors"
          >
            Back to Markets
          </button>
        </div>
      </div>
    );
  }

  // ─── Main View ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">

      {/* Navbar */}
      <div className="border-b border-[#2a2d3e] sticky top-0 z-10 bg-[#0f1117]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-[#94a3b8] hover:text-white text-sm transition-colors"
          >
            Back to Markets
          </button>
          <span className="text-indigo-400 font-bold tracking-tight">
            📈 PredictMarket
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Market Header */}
        <div className="border border-[#2a2d3e] bg-[#1a1d2e] p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white leading-snug">
                {market.title}
              </h1>
              {market.description && (
                <div className="text-[#94a3b8] text-sm mt-2">
                  {market.description}
                </div>
              )}
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 shrink-0 ${
              market.status === "active"
                ? "text-green-400 bg-green-400/10"
                : "text-gray-400 bg-gray-400/10"
            }`}>
              {market.status}
            </span>
          </div>

          {/* Volume */}
          <div className="mt-4 pt-4 border-t border-[#2a2d3e] flex items-center gap-6">
            <div>
              <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                Total Volume
              </div>
              <div className="text-2xl font-mono font-bold text-white mt-0.5">
                {market.totalMarketBets.toFixed(2)}
                <span className="text-sm text-[#94a3b8] ml-1">tokens</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                Creator
              </div>
              <div className="text-sm text-white mt-0.5 font-medium">
                {typeof market.creator === "object"
                  ? market.creator.username
                  : market.creator}
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Outcomes */}
        <div className="border border-[#2a2d3e] bg-[#1a1d2e]">
          <div className="px-6 py-4 border-b border-[#2a2d3e]">
            <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
              Outcomes
            </div>
          </div>
          <div className="p-4 space-y-2">
            {market.outcomes.map((outcome) => (
              <div
                key={outcome.id}
                onClick={() => market.status === "active" && setSelectedOutcomeId(outcome.id)}
                className={`p-4 border transition-colors ${
                  market.status === "active" ? "cursor-pointer" : "cursor-default"
                } ${
                  selectedOutcomeId === outcome.id
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-[#2a2d3e] hover:border-indigo-500/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-white">{outcome.title}</div>
                  <div className="text-2xl font-mono font-bold text-indigo-400">
                    {outcome.odds}%
                  </div>
                </div>
                <div className="w-full h-1.5 bg-[#2a2d3e]">
                  <div
                    className="h-full bg-indigo-500 transition-all"
                    style={{ width: `${outcome.odds}%` }}
                  />
                </div>
                <div className="text-xs text-[#94a3b8] mt-1.5">
                  {outcome.totalBets.toFixed(2)} tokens bet
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pie Chart */}
        {market.totalMarketBets > 0 && (
          <div className="border border-[#2a2d3e] bg-[#1a1d2e]">
            <div className="px-6 py-4 border-b border-[#2a2d3e]">
              <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                Bet Distribution
              </div>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={market.outcomes.map((o) => ({
                      name: o.title,
                      value: o.totalBets,
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(1)}%`
                    }
                  >
                    {market.outcomes.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"][index % 4]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${Number(value).toFixed(2)} tokens`}
                    contentStyle={{
                      backgroundColor: "#1a1d2e",
                      border: "1px solid #2a2d3e",
                      color: "#fff",
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: "#94a3b8", fontSize: "12px" }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Place Bet */}
        {market.status === "active" && user?.role !== "admin" && (
          <div className="border border-[#2a2d3e] bg-[#1a1d2e]">
            <div className="px-6 py-4 border-b border-[#2a2d3e]">
              <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                Place Your Bet
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                  Selected Outcome
                </div>
                <div className="bg-[#0f1117] border border-[#2a2d3e] px-4 py-3 text-sm text-white">
                  {market.outcomes.find((o) => o.id === selectedOutcomeId)?.title || "None selected"}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                  Bet Amount (tokens)
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter amount"
                  disabled={isBetting}
                  className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white px-4 py-3 text-sm placeholder-[#4a5568] focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                />
              </div>
              <button
                onClick={handlePlaceBet}
                disabled={isBetting || !selectedOutcomeId || !betAmount}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBetting ? "Placing bet..." : "Place Bet"}
              </button>
            </div>
          </div>
        )}

        {market.status === "active" && user?.role === "admin" && (
          <div className="border border-[#2a2d3e] bg-[#1a1d2e] px-6 py-4">
            <div className="text-[#94a3b8] text-sm">
              Admin accounts can resolve markets but cannot place bets.
            </div>
          </div>
        )}

        {/* Resolved State */}
        {market.status === "resolved" && (
          <div className="border border-[#2a2d3e] bg-[#1a1d2e] px-6 py-4">
            <div className="text-[#94a3b8] text-sm">
              This market has been resolved.
            </div>
          </div>
        )}

        {/* Admin Panel */}
        {market.status === "active" && user?.role === "admin" && (
          <ResolveMarketPanel
            market={market}
            onResolved={() => {
              api.getMarket(marketId).then(setMarket);
              refreshBalance();
            }}
          />
)}

      </div>
    </div>
  );
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/markets/$id")({
  component: MarketDetailPage,
});