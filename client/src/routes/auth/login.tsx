import { useForm } from "@tanstack/react-form";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);


  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async (formData) => {
      const values = formData.value;
      try {
        setIsLoading(true);
        setError(null);
        const user = await api.login(values.email, values.password);
        login(user);
        navigate({ to: "/" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-indigo-400 font-bold text-2xl tracking-tight">
            📈 PredictMarket
          </span>
          <p className="text-[#94a3b8] text-sm mt-2">
            Trade on the outcomes of real world events
          </p>
        </div>

        <div className="border border-[#2a2d3e] bg-[#1a1d2e] p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-[#94a3b8] text-sm mb-8">
            Enter your credentials to access your account
          </p>

          {/* Verified message */}
          

          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="space-y-5"
          >
            <form.Field name="email">
              {(field) => (
                <div className="space-y-1.5">
                  <label className="text-xs text-[#94a3b8] uppercase tracking-widest">
                    Email
                  </label>
                  <input
                    type="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="you@example.com"
                    disabled={isLoading}
                    className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white px-4 py-3 text-sm placeholder-[#4a5568] focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                  />
                  {field.state.meta.errors?.length > 0 && (
                    <p className="text-xs text-red-400">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <div className="space-y-1.5">
                  <label className="text-xs text-[#94a3b8] uppercase tracking-widest">
                    Password
                  </label>
                  <input
                    type="password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white px-4 py-3 text-sm placeholder-[#4a5568] focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                  />
                  {field.state.meta.errors?.length > 0 && (
                    <p className="text-xs text-red-400">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {error && (
              <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.875rem", color: "#94a3b8" }}>
            <a href="/auth/forgot-password" style={{ color: "#818cf8" }}>Forgot password?</a>
            <span style={{ margin: "0 8px" }}>·</span>
            No account yet?{" "}
            <a href="/auth/register" style={{ color: "#818cf8" }}>Sign up</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});