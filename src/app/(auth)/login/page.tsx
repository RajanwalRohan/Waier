"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleOAuth(provider: string) {
    setOauthLoading(provider);
    signIn(provider, { callbackUrl: "/dashboard" });
  }

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Sign in to your account
        </h2>

        {registered && (
          <div className="mt-4 alert-success text-center">
            Account created! Sign in to get started.
          </div>
        )}

        <div className="mt-8 card">
          {/* OAuth buttons */}
          <div className="space-y-3 mb-5">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white dark:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.10] px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {oauthLoading === "google" ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-accent-500" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => handleOAuth("apple")}
              disabled={!!oauthLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-black dark:bg-white border-0 px-4 py-2.5 text-sm font-medium text-white dark:text-black shadow-sm hover:bg-black/90 dark:hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {oauthLoading === "apple" ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              )}
              Continue with Apple
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/[0.06] dark:border-white/[0.08]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white/70 dark:bg-white/[0.06] px-3 text-slate-400 dark:text-slate-500">
                or sign in with email
              </span>
            </div>
          </div>

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

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-accent-500 hover:text-accent-600"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  {showPassword ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">Remember me</span>
              </label>
            </div>

            <button type="submit" disabled={loading || !!oauthLoading} className="btn-primary w-full">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-accent-500 hover:text-accent-600">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
