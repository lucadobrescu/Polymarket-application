import { useForm } from "@tanstack/react-form";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";

function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const form = useForm({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      securityQuestion: "",
      securityAnswer: "",
    },
    onSubmit: async (formData) => {
      const values = formData.value;
      if (values.password !== values.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (!values.securityQuestion.trim() || !values.securityAnswer.trim()) {
        setError("Security question and answer are required");
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        await api.register(
          values.username,
          values.email,
          values.password,
          values.securityQuestion,
          values.securityAnswer
        );
        setRegistered(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed");
      } finally {
        setIsLoading(false);
      }
    },
  });

  const inputClass = "w-full bg-[#0f1117] border border-[#2a2d3e] text-white px-4 py-3 text-sm placeholder-[#4a5568] focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50";

  // ─── Check email view ──────────────────────────────────────────────────────

  if (registered) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-indigo-400 font-bold text-2xl tracking-tight">
              📈 PredictMarket
            </div>
          </div>
          <div className="border border-[#2a2d3e] bg-[#1a1d2e] p-8 text-center space-y-4">
            <div className="text-4xl">📧</div>
            <div className="text-xl font-bold text-white">Check your email</div>
            <div className="text-[#94a3b8] text-sm">
              We sent a verification link to your email address.
              Click the link to activate your account.
            </div>
            <button
              onClick={() => navigate({ to: "/auth/login" })}
              className="w-full border border-[#2a2d3e] text-[#94a3b8] hover:text-white py-3 text-sm transition-colors mt-4"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Register form ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-indigo-400 font-bold text-2xl tracking-tight">
            📈 PredictMarket
          </div>
          <div className="text-[#94a3b8] text-sm mt-2">
            Start with 1000 tokens, no deposit required
          </div>
        </div>

        <div className="border border-[#2a2d3e] bg-[#1a1d2e] p-8">
          <div className="text-2xl font-bold text-white mb-1">Create account</div>
          <div className="text-[#94a3b8] text-sm mb-8">
            Join and start trading on prediction markets
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="space-y-5"
          >
            {/* Username */}
            <form.Field
              name="username"
              validators={{
                onChange: ({ value }) => {
                  if (!value || value.length < 3)
                    return "Username must be at least 3 characters";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                    Username
                  </div>
                  <input
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="your username"
                    disabled={isLoading}
                    className={inputClass}
                  />
                  {field.state.meta.errors?.length > 0 && (
                    <div className="text-xs text-red-400">
                      {field.state.meta.errors.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            {/* Email */}
            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
                    return "Invalid email address";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                    Email
                  </div>
                  <input
                    type="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="you@example.com"
                    disabled={isLoading}
                    className={inputClass}
                  />
                  {field.state.meta.errors?.length > 0 && (
                    <div className="text-xs text-red-400">
                      {field.state.meta.errors.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            {/* Password */}
            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) => {
                  if (!value || value.length < 6)
                    return "Password must be at least 6 characters";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                    Password
                  </div>
                  <input
                    type="password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className={inputClass}
                  />
                  {field.state.meta.errors?.length > 0 && (
                    <div className="text-xs text-red-400">
                      {field.state.meta.errors.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            {/* Confirm Password */}
            <form.Field
              name="confirmPassword"
              validators={{
                onChange: ({ value }) => {
                  const password = form.getFieldValue("password");
                  if (value && password && value !== password)
                    return "Passwords do not match";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                    Confirm Password
                  </div>
                  <input
                    type="password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className={inputClass}
                  />
                  {field.state.meta.errors?.length > 0 && (
                    <div className="text-xs text-red-400">
                      {field.state.meta.errors.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            {/* Account Recovery */}
            <div className="border-t border-[#2a2d3e] pt-5">
              <div className="text-xs text-[#94a3b8] uppercase tracking-widest mb-4">
                Account Recovery
              </div>

              <form.Field
                name="securityQuestion"
                validators={{
                  onChange: ({ value }) => {
                    if (!value || value.trim().length < 5)
                      return "Security question must be at least 5 characters";
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-1.5 mb-4">
                    <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                      Security Question
                    </div>
                    <input
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="What was your first pet name?"
                      disabled={isLoading}
                      className={inputClass}
                    />
                    {field.state.meta.errors?.length > 0 && (
                      <div className="text-xs text-red-400">
                        {field.state.meta.errors.join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field
                name="securityAnswer"
                validators={{
                  onChange: ({ value }) => {
                    if (!value || value.trim().length < 2)
                      return "Answer must be at least 2 characters";
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                      Security Answer
                    </div>
                    <input
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Your answer (case insensitive)"
                      disabled={isLoading}
                      className={inputClass}
                    />
                    {field.state.meta.errors?.length > 0 && (
                      <div className="text-xs text-red-400">
                        {field.state.meta.errors.join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

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
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.875rem", color: "#94a3b8" }}>
            Have an account?{" "}
            <a href="/auth/login" style={{ color: "#818cf8" }}>Login</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
});