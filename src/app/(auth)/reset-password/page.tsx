"use client";

import { Suspense, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const PASSWORD_RULES = [
  { label: "At least 12 characters", test: (p: string) => p.length >= 12 },
  { label: "1 uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "1 lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "2 numbers", test: (p: string) => /(?:.*\d){2,}/.test(p) },
  { label: "1 special character (!@#$...)", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p) },
];

function PasswordChecklist({ password }: { password: string }) {
  const results = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password],
  );

  return (
    <ul className="mt-3 space-y-1.5">
      {results.map((rule) => (
        <li key={rule.label} className="flex items-center gap-2 text-xs">
          <span className={`transition-colors ${rule.passed ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`}>
            {rule.passed ? (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
          </span>
          <span className={`transition-colors ${rule.passed ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
            {rule.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-full items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const allPassed = PASSWORD_RULES.every((rule) => rule.test(password));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    if (!allPassed) {
      setError("Please meet all password requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-full flex-col justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="card">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/20">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="mt-4 font-semibold text-slate-900 dark:text-white">Invalid reset link</p>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">This link is missing or malformed.</p>
              <Link
                href="/forgot-password"
                className="mt-5 text-sm font-medium text-accent-500 hover:text-accent-600"
              >
                Request a new reset link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Set a new password
        </h2>

        <div className="mt-8">
          {success ? (
            <div className="card">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/20">
                  <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="mt-4 font-semibold text-slate-900 dark:text-white">Password reset successful</p>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  Your password has been updated. You can now sign in.
                </p>
                <Link
                  href="/login"
                  className="mt-5 text-sm font-medium text-accent-500 hover:text-accent-600"
                >
                  Sign in
                </Link>
              </div>
            </div>
          ) : (
            <div className="card">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && <div className="alert-error">{error}</div>}

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    New password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    maxLength={128}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field mt-1.5"
                  />
                  <PasswordChecklist password={password} />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    maxLength={128}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field mt-1.5"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-1.5 text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>

                <button type="submit" disabled={loading || !allPassed} className="btn-primary w-full">
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
