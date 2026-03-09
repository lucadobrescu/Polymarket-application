const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4001";

// Types
export interface Market {
  id: number;
  title: string;
  description?: string;
  status: "active" | "resolved";
  creator?: string;
  outcomes: MarketOutcome[];
  totalMarketBets: number;
}

export interface MarketOutcome {
  id: number;
  title: string;
  odds: number;
  totalBets: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  token: string;
  balance: number;
}

export interface Bet {
  id: number;
  userId: number;
  marketId: number;
  outcomeId: number;
  amount: number;
  createdAt: string;
}

export interface ActiveBet {
  betId: number;
  amount: number;
  createdAt: string;
  marketId: number;
  marketTitle: string;
  outcomeId: number;
  outcomeTitle: string;
  odds: number;
}

export interface ResolvedBet {
  betId: number;
  amount: number;
  createdAt: string;
  marketId: number;
  marketTitle: string;
  outcomeId: number;
  outcomeTitle: string;
  won: boolean;
}

export interface UserProfile {
  balance: number;
  activeBets: {
    data: ActiveBet[];
    hasMore: boolean;
  };
  resolvedBets: {
    data: ResolvedBet[];
    hasMore: boolean;
  };
}

// API Client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeader() {
    const token = localStorage.getItem("auth_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...this.getAuthHeader(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers: headers as any,
    });

    const data = await response.json();

    if (!response.ok) {
  
      // If there are validation errors, throw them
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessage = data.errors.map((e: any) => `${e.field}: ${e.message}`).join(", ");
        throw new Error(errorMessage);
      }
      throw new Error(data.error || `API Error: ${response.status}`);
    }

    return data ?? {};
  }

  // Auth endpoints
  async register(username: string, email: string, password: string): Promise<User> {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
  }

  async login(email: string, password: string): Promise<User> {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  // Markets endpoints
  async listMarkets(status: "active" | "resolved" = "active", page: number = 1, limit: number = 20): Promise<{ markets: Market[], hasMore: boolean }> {
  const data = await this.request(`/api/markets?status=${status}&page=${page}&limit=${limit + 1}`);
  return {
    markets: data.slice(0, limit),
    hasMore: data.length > limit
  };
}

  async getMarket(id: number): Promise<Market> {
    return this.request(`/api/markets/${id}`);
  }

  async createMarket(title: string, description: string, outcomes: string[]): Promise<Market> {
    return this.request("/api/markets", {
      method: "POST",
      body: JSON.stringify({ title, description, outcomes }),
    });
  }

  // Bets endpoints
  async placeBet(marketId: number, outcomeId: number, amount: number): Promise<Bet> {
    return this.request(`/api/markets/${marketId}/bets`, {
      method: "POST",
      body: JSON.stringify({ outcomeId, amount }),
    });
  }

    async getProfile(activePage: number = 1, resolvedPage: number = 1): Promise<UserProfile> {
  return this.request(
    `/api/users/profile?activePage=${activePage}&resolvedPage=${resolvedPage}`
  );
}

}



export const api = new ApiClient(API_BASE_URL);

