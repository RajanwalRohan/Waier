import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 px-4">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Your AI Health Coach
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Personalized fitness coaching, nutrition tracking, and health insights
          powered by AI. Connect your wearables, log your workouts, and get
          smarter every day.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-4">
          <Link href="/signup" className="btn-primary text-base px-6 py-3">
            Get Started
          </Link>
          <Link href="/login" className="btn-secondary text-base px-6 py-3">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
