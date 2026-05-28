"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <div className="mt-8">
          {submitted ? (
            <div className="card">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/20">
                  <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="mt-4 font-semibold text-slate-900 dark:text-white">Check your email</p>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  If an account exists with that email, you&apos;ll receive a password reset link shortly.
                </p>
                <Link
                  href="/login"
                  className="mt-5 text-sm font-medium text-accent-500 hover:text-accent-600"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <div className="card">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && <div className="alert-error">{error}</div>}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    maxLength={255}
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field mt-1.5"
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>

                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                  <Link href="/login" className="font-medium text-accent-500 hover:text-accent-600">
                    Back to sign in
                  </Link>
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
