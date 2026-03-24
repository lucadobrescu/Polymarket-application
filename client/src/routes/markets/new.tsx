import { useForm } from "@tanstack/react-form";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function CreateMarketPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthenticated) {
    navigate({ to: "/auth/login" });
    return null;
  }

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      outcomes: ["", ""],
    },
    onSubmit: async (formData) => {
      const values = formData.value;
      if (!values.title.trim()) {
        setError("Market title is required");
        return;
      }
      const validOutcomes = values.outcomes.filter((o) => o.trim());
      if (validOutcomes.length < 2) {
        setError("At least 2 outcomes are required");
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const market = await api.createMarket(values.title, values.description, validOutcomes);
        navigate({ to: `/markets/${market.id}` });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create market");
      } finally {
        setIsLoading(false);
      }
    },
  });

  const inputClass = "w-full bg-[#0f1117] border border-[#2a2d3e] text-white px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 placeholder-[#4a5568]";

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">

      {/* Navbar */}
      <div className="border-b border-[#2a2d3e] sticky top-0 z-10 bg-[#0f1117]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-[#94a3b8] hover:text-white text-sm transition-colors"
          >
            Back to Markets
          </button>
          <div className="text-indigo-400 font-bold tracking-tight">
            📈 PredictMarket
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="text-3xl font-bold text-white tracking-tight">
            Create a Market
          </div>
          <div className="text-[#94a3b8] text-sm mt-1">
            Set up a new prediction market and define the outcomes
          </div>
        </div>

        {/* Form */}
        <div className="border border-[#2a2d3e] bg-[#1a1d2e] p-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="space-y-6"
          >
            {/* Title */}
            <form.Field name="title">
              {(field) => (
                <div className="space-y-1.5">
                  <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                    Market Title
                  </div>
                  <input
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Will Bitcoin reach $100k by end of 2025?"
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>
              )}
            </form.Field>

            {/* Description */}
            <form.Field name="description">
              {(field) => (
                <div className="space-y-1.5">
                  <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                    Description (Optional)
                  </div>
                  <textarea
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Provide more context about this market..."
                    disabled={isLoading}
                    rows={4}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              )}
            </form.Field>

            {/* Outcomes */}
            <div className="space-y-3">
              <div className="text-xs text-[#94a3b8] uppercase tracking-widest">
                Outcomes
              </div>
              <form.Field name="outcomes">
                {(field) => (
                  <div className="space-y-2">
                    {field.state.value.map((outcome, index) => (
                      <input
                        key={index}
                        type="text"
                        value={outcome}
                        onChange={(e) => {
                          const newOutcomes = [...field.state.value];
                          newOutcomes[index] = e.target.value;
                          field.handleChange(newOutcomes);
                        }}
                        onBlur={field.handleBlur}
                        placeholder={`Outcome ${index + 1}`}
                        disabled={isLoading}
                        className={inputClass}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => field.handleChange([...field.state.value, ""])}
                      disabled={isLoading}
                      className="w-full border border-dashed border-[#2a2d3e] hover:border-indigo-500 text-[#94a3b8] hover:text-indigo-400 py-3 text-sm transition-colors disabled:opacity-50"
                    >
                      + Add Outcome
                    </button>
                  </div>
                )}
              </form.Field>
            </div>

            {/* Error */}
            {error && (
              <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Creating..." : "Create Market"}
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: "/" })}
                disabled={isLoading}
                className="flex-1 border border-[#2a2d3e] text-[#94a3b8] hover:text-white hover:border-[#94a3b8] py-3 text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

export const Route = createFileRoute("/markets/new")({
  component: CreateMarketPage,
});