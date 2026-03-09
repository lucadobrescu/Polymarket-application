import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api, Market } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MarketCard } from "@/components/market-card";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

function DashboardPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"active" | "resolved">("active");
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const loadMarkets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.listMarkets(status, page, limit);
      setMarkets(data.markets);  // FIXED: removed the second setMarkets(data) call
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load markets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMarkets();
  }, [status, page]);

  const handleStatusChange = (newStatus: "active" | "resolved") => {
    setStatus(newStatus);
    setPage(1);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">Prediction Markets</h1>
          <p className="text-gray-600 mb-8 text-lg">Create and participate in prediction markets</p>
          <div className="space-x-4">
            <Button onClick={() => navigate({ to: "/auth/login" })}>Login</Button>
            <Button variant="outline" onClick={() => navigate({ to: "/auth/register" })}>
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Markets</h1>
            <div className="flex flex-col gap-1 mt-2">
              <p className="text-gray-600">Welcome back, {user?.username}!</p>
              <p className="text-indigo-600 font-bold">
                Balance: {user?.balance !== undefined ? `${user.balance.toFixed(2)} tokens` : 'Loading...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate({ to: "/auth/logout" })}>
              Logout
            </Button>
            <Button onClick={() => navigate({ to: "/markets/new" })}>Create Market</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <Button
            variant={status === "active" ? "default" : "outline"}
            onClick={() => handleStatusChange("active")}
          >
            Active Markets
          </Button>
          <Button
            variant={status === "resolved" ? "default" : "outline"}
            onClick={() => handleStatusChange("resolved")}
          >
            Resolved Markets
          </Button>
          <Button variant="outline" onClick={loadMarkets} disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-6">
            {error}
          </div>
        )}

        {/* Markets Grid */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading markets...</p>
            </CardContent>
          </Card>
        ) : markets.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-muted-foreground text-lg">
                  No {status} markets found.{" "}
                  {status === "active" && "Create one to get started!"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {markets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-8 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                Previous Page
              </Button>
              <div className="text-sm text-gray-600 font-medium">
                Page {page}
              </div>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore || isLoading}  // FIXED: uses hasMore instead of markets.length < limit
              >
                Next Page
              </Button>
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