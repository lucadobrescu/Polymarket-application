import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api, ActiveBet, ResolvedBet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeBets, setActiveBets] = useState<ActiveBet[]>([]);
  const [resolvedBets, setResolvedBets] = useState<ResolvedBet[]>([]);
  const [activeHasMore, setActiveHasMore] = useState(false);
  const [resolvedHasMore, setResolvedHasMore] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [resolvedPage, setResolvedPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (isAuthenticated) loadProfile();
  }, [activePage, resolvedPage, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-muted-foreground">Please log in to view your profile</p>
            <Button onClick={() => navigate({ to: "/auth/login" })}>Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: "/" })}>
          Back to Markets
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{user?.username}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{user?.email}</p>
            <p className="text-indigo-600 font-bold text-xl mt-1">
              Balance: {user?.balance?.toFixed(2)} tokens
            </p>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Active Bets</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-4">Loading...</p>
            ) : activeBets.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No active bets yet.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {activeBets.map((bet) => (
                    <div key={bet.betId} className="flex items-center justify-between p-4 rounded-lg border bg-white">
                      <div>
                        <p className="font-semibold text-primary cursor-pointer hover:underline"
                          onClick={() => navigate({ to: "/markets/$id", params: { id: String(bet.marketId) } })}>
                          {bet.marketTitle}
                        </p>
                        <p className="text-sm text-muted-foreground">Outcome: {bet.outcomeTitle}</p>
                        <p className="text-sm text-muted-foreground">Amount: {bet.amount.toFixed(2)} tokens</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{bet.odds}%</p>
                        <p className="text-xs text-muted-foreground">current odds</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => setActivePage((p) => Math.max(1, p - 1))} disabled={activePage === 1 || isLoading}>
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">Page {activePage}</span>
                  <Button variant="outline" size="sm" onClick={() => setActivePage((p) => p + 1)} disabled={!activeHasMore || isLoading}>
                    Next
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resolved Bets</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-4">Loading...</p>
            ) : resolvedBets.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No resolved bets yet.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {resolvedBets.map((bet) => (
                    <div key={bet.betId} className="flex items-center justify-between p-4 rounded-lg border bg-white">
                      <div>
                        <p className="font-semibold text-primary cursor-pointer hover:underline"
                          onClick={() => navigate({ to: "/markets/$id", params: { id: String(bet.marketId) } })}>
                          {bet.marketTitle}
                        </p>
                        <p className="text-sm text-muted-foreground">Outcome: {bet.outcomeTitle}</p>
                        <p className="text-sm text-muted-foreground">Amount: {bet.amount.toFixed(2)} tokens</p>
                      </div>
                      <Badge variant={bet.won ? "default" : "destructive"}>
                        {bet.won ? "Won" : "Lost"}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => setResolvedPage((p) => Math.max(1, p - 1))} disabled={resolvedPage === 1 || isLoading}>
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">Page {resolvedPage}</span>
                  <Button variant="outline" size="sm" onClick={() => setResolvedPage((p) => p + 1)} disabled={!resolvedHasMore || isLoading}>
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

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});