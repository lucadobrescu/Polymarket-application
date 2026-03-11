import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api, LeaderboardEntry } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function LeaderboardPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

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

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "text-yellow-500 font-bold text-xl";
    if (rank === 2) return "text-gray-400 font-bold text-lg";
    if (rank === 3) return "text-amber-600 font-bold text-lg";
    return "text-gray-600 font-medium";
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: "/" })}>
          ← Back to Markets
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">🏆 Leaderboard</CardTitle>
            <p className="text-muted-foreground">
              Ranked by current balance. Starting balance was 1000 tokens.
            </p>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">
                {error}
              </div>
            )}

            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading leaderboard...</p>
            ) : entries.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No users yet.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <div
                      key={entry.rank}
                      className={`flex items-center justify-between p-4 rounded-lg border bg-white ${
                        entry.rank <= 3 ? "border-yellow-200 bg-yellow-50/50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={getRankStyle(entry.rank)}>
                          {getRankEmoji(entry.rank)}
                        </span>
                        <div>
                          <p className="font-semibold">{entry.username}</p>
                          <p className="text-sm text-muted-foreground">
                            Balance: {entry.balance.toFixed(2)} tokens
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          entry.earnings >= 0 ? "text-green-600" : "text-red-500"
                        }`}>
                          {entry.earnings >= 0 ? "+" : ""}{entry.earnings.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">earnings</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">Page {page}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasMore || isLoading}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
});