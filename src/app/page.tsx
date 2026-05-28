import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[30%] left-[15%] h-[500px] w-[500px] rounded-full bg-accent-400/15 blur-[120px]" />
        <div className="absolute -bottom-[20%] right-[10%] h-[450px] w-[450px] rounded-full bg-violet-400/10 blur-[100px]" />
        <div className="absolute top-[40%] right-[30%] h-[300px] w-[300px] rounded-full bg-blue-400/5 blur-[80px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-xl text-center">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-accent-500">
          Waier
        </p>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
          Your health,{" "}
          <span className="bg-gradient-to-r from-accent-500 to-violet-500 bg-clip-text text-transparent">
            intelligently
          </span>{" "}
          guided.
        </h1>
        <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg">
          Personalized coaching, nutrition tracking, and health insights
          — powered by Wynn, your AI coach built on the Waer engine.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/signup" className="btn-primary text-base px-8 py-3">
            Get Started
          </Link>
          <Link href="/login" className="btn-secondary text-base px-8 py-3">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
