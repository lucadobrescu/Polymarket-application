const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4001";

export interface Market {
  id: number;
  title: string;
  description?: string;
  status: "active" | "resolved";
  creator: { username: string };
  totalMarketBets: number;
  participants: number;
  createdAt?: string;
  outcomes: {
    id: number;
    title: string;
    odds: number;
    totalBets: number;
  }[];
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
  role: "user" | "admin";
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
  role: "user" | "admin";
  activeBets: {
    data: ActiveBet[];
    hasMore: boolean;
  };
  resolvedBets: {
    data: ResolvedBet[];
    hasMore: boolean;
  };
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  balance: number;
  earnings: number;
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[];
  hasMore: boolean;
}

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
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessage = data.errors.map((e: any) => `${e.field}: ${e.message}`).join(", ");
        throw new Error(errorMessage);
      }
      throw new Error(data.error || `API Error: ${response.status}`);
    }
    return data ?? {};
  }

  async getSecurityQuestion(email: string): Promise<{ securityQuestion: string }> {
    return this.request(`/api/auth/security-question/${email}`);
  }

  async resetPassword(
    email: string,
    securityAnswer: string,
    newPassword: string
  ): Promise<{ success: boolean }> {
    return this.request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, securityAnswer, newPassword }),
    });
  }

  async forgotPasswordEmail(email: string): Promise<{ message: string }> {
    return this.request("/api/auth/forgot-password-email", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean }> {
    return this.request("/api/auth/reset-password-token", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async register(
    username: string,
    email: string,
    password: string,
    securityQuestion: string,
    securityAnswer: string
  ) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password, securityQuestion, securityAnswer }),
    });
  }
  async login(email: string, password: string): Promise<User> {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async listMarkets(
  status: string = "active",
  page: number = 1,
  limit: number = 20,
  sortBy: string = "date",
  sortOrder: string = "desc"
) {
  const data = await this.request(
    `/api/markets?status=${status}&page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`
  );
  return {
    markets: data.data,
    hasMore: data.hasMore,
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
  async placeBet(marketId: number, outcomeId: number, amount: number): Promise<Bet> {
    return this.request(`/api/markets/${marketId}/bets`, {
      method: "POST",
      body: JSON.stringify({ outcomeId, amount }),
    });
  }
  async resolveMarket(marketId: number, outcomeId: number): Promise<{ success: boolean }> {
    return this.request(`/api/markets/${marketId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ outcomeId }),
    });
}

    async getProfile(activePage: number = 1, resolvedPage: number = 1): Promise<UserProfile> {
  return this.request(
    `/api/users/profile?activePage=${activePage}&resolvedPage=${resolvedPage}`
  );
}

async getLeaderboard(page: number = 1): Promise<LeaderboardResponse> {
  return this.request(`/api/leaderboard?page=${page}`);
}

async getApiKeyStatus(): Promise<{ hasApiKey: boolean }> {
  return this.request("/api/users/api-key");
}

async generateApiKey(): Promise<{ apiKey: string }> {
  return this.request("/api/users/api-key/generate", {
    method: "POST",
  });
}

}




export const api = new ApiClient(API_BASE_URL);



