"use client";

import { useState, useRef } from "react";

interface SearchInputProps {
  onAnalyze: (companyName: string) => void;
  isLoading: boolean;
}

const EXAMPLE_COMPANIES = [
  "Apple",
  "Tesla",
  "Microsoft",
  "NVIDIA",
  "Google",
  "Amazon",
  "Meta",
  "Netflix",
];

export default function SearchInput({
  onAnalyze,
  isLoading,
}: SearchInputProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onAnalyze(query.trim());
    }
  };

  const handleExampleClick = (company: string) => {
    setQuery(company);
    onAnalyze(company);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter a company name (e.g., Apple, Tesla, NVIDIA)..."
            className="search-input w-full px-6 py-4 text-lg pr-4"
            disabled={isLoading}
            id="company-search-input"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className={`btn-primary px-8 py-4 text-lg whitespace-nowrap ${isLoading ? "loading" : ""}`}
            id="analyze-button"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Analyzing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Analyze
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Example company chips */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        <span
          className="text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          Try:
        </span>
        {EXAMPLE_COMPANIES.map((company) => (
          <button
            key={company}
            onClick={() => handleExampleClick(company)}
            disabled={isLoading}
            className="px-3 py-1 rounded-full text-sm transition-all duration-200 hover:scale-105 disabled:opacity-40"
            style={{
              background: "var(--surface-elevated)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            {company}
          </button>
        ))}
      </div>
    </div>
  );
}
