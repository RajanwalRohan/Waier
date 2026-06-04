import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { kgToLbs } from "@/lib/units";
import type { UnitSystem } from "@/lib/units";
import { FlowCard } from "@/components/FlowCard";

/** Icon + color config per metric type. Falls back to a generic style. */
const METRIC_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  steps:              { label: "Steps",                icon: "trend-up",   color: "bg-violet-50 dark:bg-violet-500/20 text-violet-400" },
  heart_rate:         { label: "Heart Rate",           icon: "heart",      color: "bg-violet-50 dark:bg-violet-500/20 text-violet-400" },
  resting_heart_rate: { label: "Resting HR",           icon: "heart",      color: "bg-rose-50 dark:bg-rose-500/20 text-rose-500" },
  sleep_hours:        { label: "Sleep",                icon: "moon",       color: "bg-violet-50 dark:bg-violet-500/20 text-violet-400" },
  calories_burned:    { label: "Calories Burned",      icon: "flame",      color: "bg-violet-50 dark:bg-violet-500/20 text-violet-400" },
  active_calories:    { label: "Active Calories",      icon: "flame",      color: "bg-amber-50 dark:bg-amber-500/20 text-amber-500" },
  blood_oxygen:       { label: "Blood Oxygen",          icon: "droplet",    color: "bg-violet-50 dark:bg-violet-500/20 text-violet-400" },
  respiratory_rate:   { label: "Respiratory Rate",     icon: "wind",       color: "bg-teal-50 dark:bg-teal-500/20 text-teal-500" },
  hrv:                { label: "HRV",                    icon: "activity",   color: "bg-violet-50 dark:bg-violet-500/20 text-violet-400" },
  weight:             { label: "Weight",               icon: "scale",      color: "bg-violet-50 dark:bg-violet-500/20 text-violet-400" },
  skin_temperature:   { label: "Skin Temp",            icon: "thermometer",color: "bg-orange-50 dark:bg-orange-500/20 text-orange-500" },
  blood_glucose:      { label: "Blood Glucose",        icon: "droplet",    color: "bg-pink-50 dark:bg-pink-500/20 text-pink-500" },
  vo2_max:            { label: "VO2 Max",              icon: "activity",   color: "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-500" },
  body_fat_percentage:{ label: "Body Fat",             icon: "scale",      color: "bg-yellow-50 dark:bg-yellow-500/20 text-yellow-500" },
  stress_level:       { label: "Stress",               icon: "activity",   color: "bg-red-50 dark:bg-red-500/20 text-red-500" },
  body_battery:       { label: "Body Battery",         icon: "battery",    color: "bg-lime-50 dark:bg-lime-500/20 text-lime-500" },
  distance:           { label: "Distance",             icon: "trend-up",   color: "bg-sky-50 dark:bg-sky-500/20 text-sky-500" },
  floors_climbed:     { label: "Floors",               icon: "trend-up",   color: "bg-fuchsia-50 dark:bg-fuchsia-500/20 text-fuchsia-500" },
};

const DEFAULT_CONFIG = { label: "", icon: "activity", color: "bg-slate-100 dark:bg-slate-500/20 text-slate-500" };

/** Priority order — metrics listed first are shown first on the dashboard. */
const PRIORITY_ORDER = [
  "steps", "heart_rate", "sleep_hours", "hrv", "blood_oxygen",
  "calories_burned", "resting_heart_rate", "vo2_max", "weight",
  "skin_temperature", "blood_glucose", "respiratory_rate",
  "stress_level", "body_battery", "active_calories", "distance",
  "floors_climbed", "body_fat_percentage",
];

export default async function DashboardPage() {
  const session = await getServerSession();
  const userId = session!.user.id;

  const [recentWorkouts, todayMeals, recentMetrics, profile] = await Promise.all([
    db.workout.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 3,
      include: { exercises: true },
    }),
    db.meal.findMany({
      where: {
        userId,
        date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      orderBy: { date: "desc" },
    }),
    db.healthMetric.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 200, // enough to get latest of each type
    }),
    db.profile.findUnique({
      where: { userId },
      select: { unitSystem: true },
    }),
  ]);

  const unitSystem = (profile?.unitSystem || "imperial") as UnitSystem;

  // Deduplicate to latest reading per metric type
  const latestByType = new Map<string, { value: number; unit: string; date: Date }>();
  // Collect last 7 readings per metric type (most recent last, for left→right chronological bars)
  const last7ByType = new Map<string, number[]>();
  for (const m of recentMetrics) {
    if (!latestByType.has(m.type)) {
      latestByType.set(m.type, { value: m.value, unit: m.unit, date: m.date });
    }
    const arr = last7ByType.get(m.type) ?? [];
    if (arr.length < 7) {
      arr.push(m.value);
      last7ByType.set(m.type, arr);
    }
  }
  // Reverse so bars render oldest → newest (left → right)
  last7ByType.forEach((v, k) => last7ByType.set(k, v.slice().reverse()));

  // Sort by priority, then alphabetically for unknown types
  const sortedTypes = Array.from(latestByType.keys()).sort((a, b) => {
    const ai = PRIORITY_ORDER.indexOf(a);
    const bi = PRIORITY_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  // Show up to 7 metric cards (+ 1 Calories card = 8 total)
  const displayMetrics = sortedTypes.slice(0, 7);

  const todayCalories = todayMeals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
  const caloriesBurned = latestByType.get("calories_burned")?.value ?? 0;
  const netCalories = Math.round(todayCalories - caloriesBurned);

  // Filter out calories_burned from display metrics since it goes in the combined calories pane
  const filteredDisplayMetrics = displayMetrics.filter((t) => t !== "calories_burned");

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-8">
        <p className="text-sm font-medium text-slate-400">{getGreeting()}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {session!.user.name ?? "Welcome back"}
        </h1>
      </div>

      {/* Flow: signature score, Orb, and pillar breakdown */}
      <FlowCard />

      <div className="card mb-6 bg-gradient-to-br from-accent-50/80 to-violet-50/60 dark:from-accent-900/20 dark:to-violet-900/20 border-accent-100/40 dark:border-accent-500/20">
        <div className="flex items-start gap-3">
          <svg className="h-6 w-6 shrink-0 mt-0.5 text-accent-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
          </svg>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Wynn&apos;s Insight</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {recentWorkouts.length === 0
                ? "Start logging your workouts to get personalized insights!"
                : `You've logged ${recentWorkouts.length} recent workouts. Keep up the great work!`}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-3">
        <QuickAction href="/log?tab=workout" label="Workout" icon={<DumbbellIcon />} />
        <QuickAction href="/log?tab=meal" label="Meal" icon={<UtensilsIcon />} />
        <QuickAction href="/coach" label="Coach" icon={<SparkleIcon />} />
        <QuickAction href="/progress" label="Metrics" icon={<ChartBarIcon />} />
      </div>

      {/* Dynamic health metric cards */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {filteredDisplayMetrics.map((type) => {
          const data = latestByType.get(type)!;
          const config = METRIC_CONFIG[type] ?? { ...DEFAULT_CONFIG, label: type.replace(/_/g, " ") };

          // Convert weight to user's preferred unit system
          let value = data.value;
          let unit = data.unit;
          if (type === "weight" && data.unit === "kg" && unitSystem === "imperial") {
            value = kgToLbs(data.value);
            unit = "lbs";
          }

          const displayValue = formatMetricValue(value, type);
          const displayUnit = unit === "percent" ? "percentage" : unit;
          const colorClass = config.color.split(" ").find((c) => c.startsWith("text-")) ?? "text-slate-500";
          return (
            <a key={type} href={`/metrics/${type}`} className="contents">
              <MetricCard
                label={config.label}
                value={displayValue}
                unit={displayUnit}
                icon={<MetricIcon name={config.icon} />}
                iconColor={colorClass}
                sparkValues={last7ByType.get(type) ?? []}
              />
            </a>
          );
        })}
        {/* If no wearable metrics, show empty-state cards */}
        {filteredDisplayMetrics.length === 0 && (
          <>
            <MetricCard label="Steps" value={"\u2014"} unit="steps" icon={<MetricIcon name="trend-up" />} iconColor="text-violet-400" sparkValues={[]} />
            <MetricCard label="Heart Rate" value={"\u2014"} unit="bpm" icon={<MetricIcon name="heart" />} iconColor="text-violet-400" sparkValues={[]} />
            <MetricCard label="Sleep" value={"\u2014"} unit="hours" icon={<MetricIcon name="moon" />} iconColor="text-violet-400" sparkValues={[]} />
          </>
        )}

        {/* Calories — full-width pane with Intake, Burned, Net */}
        <div className="col-span-2 card">
          <div className="flex items-center gap-2 mb-3">
            <FlameIcon className="h-5 w-5 text-violet-400" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Calories</p>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Intake</p>
                <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {todayCalories > 0 ? Math.round(todayCalories).toLocaleString() : "\u2014"}
                </p>
                <p className="text-[11px] text-slate-400">kcal</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Burned</p>
                <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {caloriesBurned > 0 ? Math.round(caloriesBurned).toLocaleString() : "\u2014"}
                </p>
                <p className="text-[11px] text-slate-400">kcal</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 mb-0.5">Net</p>
              <p className={`text-2xl font-bold tracking-tight ${
                todayCalories === 0 && caloriesBurned === 0
                  ? "text-slate-300 dark:text-slate-600"
                  : netCalories >= 0
                    ? "text-emerald-500"
                    : "text-red-500"
              }`}>
                {todayCalories === 0 && caloriesBurned === 0
                  ? "\u2014"
                  : `${netCalories >= 0 ? "+" : ""}${netCalories.toLocaleString()}`}
              </p>
              <p className="text-[11px] text-slate-400">kcal</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Recent Workouts
        </h2>
        {recentWorkouts.length === 0 ? (
          <p className="text-sm text-slate-400">No workouts logged yet.</p>
        ) : (
          <div className="space-y-2">
            {recentWorkouts.map((w) => (
              <div key={w.id} className="card py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{w.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {w.exercises.length} exercises
                      {w.durationMin ? ` \u00b7 ${w.durationMin} min` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">
                    {new Date(w.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatMetricValue(value: number, type: string): string {
  if (type === "steps" || type === "floors_climbed") return Math.round(value).toLocaleString();
  if (type === "sleep_hours") return value.toFixed(1);
  if (type === "blood_oxygen" || type === "body_fat_percentage") return `${Math.round(value)}`;
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a href={href} className="card flex flex-col items-center gap-2.5 py-4 px-2 text-xs font-medium text-slate-600 dark:text-slate-300 transition-all hover:shadow-glass-lg active:scale-[0.97]">
      <div className="text-accent-500">
        {icon}
      </div>
      {label}
    </a>
  );
}

function MetricCard({ label, value, unit, icon, iconColor, sparkValues }: { label: string; value: string; unit: string; icon: React.ReactNode; iconColor: string; sparkValues: number[] }) {
  return (
    <div className="card flex justify-between items-end">
      <div>
        <div className="flex items-center gap-2">
          <span className={iconColor}>{icon}</span>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize whitespace-nowrap">{label}</p>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
        <p className="mt-0.5 text-xs text-slate-400">{unit}</p>
      </div>
      <MiniSparkline values={sparkValues} />
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ── Mini Sparkline ──
// Bars reflect the last 7 measurements (oldest → newest, left → right).
// Values are normalized against the min/max of the window so flat-ish data still reads clearly.
function MiniSparkline({ values }: { values: number[] }) {
  if (values.length === 0) return <div className="w-[39px]" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const MIN_H = 6;
  const MAX_H = 24;
  return (
    <div className="flex items-end gap-[3px] pb-1 text-violet-400">
      {values.map((v, i) => {
        const norm = range === 0 ? 0.5 : (v - min) / range;
        const h = MIN_H + norm * (MAX_H - MIN_H);
        return (
          <div
            key={i}
            className="w-[3px] rounded-full bg-current"
            style={{ height: `${h}px` }}
          />
        );
      })}
    </div>
  );
}

// ── Icon Components ──

function MetricIcon({ name }: { name: string }) {
  switch (name) {
    case "heart": return <HeartIcon />;
    case "moon": return <MoonIcon />;
    case "flame": return <FlameIcon className="h-5 w-5" />;
    case "trend-up": return <TrendUpIcon />;
    case "droplet": return <DropletIcon />;
    case "wind": return <WindIcon />;
    case "thermometer": return <ThermometerIcon />;
    case "scale": return <ScaleIcon />;
    case "battery": return <BatteryIcon />;
    case "activity":
    default: return <ActivityIcon />;
  }
}

function DumbbellIcon() {
  return (<svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6.5 7.5v9M17.5 7.5v9M3 10v4M21 10v4M6.5 12h11" /></svg>);
}
function UtensilsIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Fork — outer tines curve into neck, center tine + handle */}
      <path d="M6.5 2v5c0 1.5 1 3 2.5 3s2.5-1.5 2.5-3V2" />
      <line x1="9" y1="2" x2="9" y2="5" />
      <line x1="9" y1="10" x2="9" y2="22" />
      {/* Knife — curved blade edge with straight back */}
      <path d="M15 2c2.5 0 3 4 3 5.5 0 1.5-1 2.5-3 2.5" />
      <line x1="15" y1="2" x2="15" y2="22" />
    </svg>
  );
}
function SparkleIcon() {
  return (<svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" /></svg>);
}
function ChartBarIcon() {
  return (<svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16M8 16V10M12 16V6M16 16v-6" /></svg>);
}
function TrendUpIcon() {
  return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8M17 7h4v4" /></svg>);
}
function HeartIcon() {
  return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>);
}
function MoonIcon() {
  return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>);
}
function FlameIcon({ className }: { className?: string }) {
  return (<svg className={className ?? "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c-4 5-7 8.5-7 12.5a7 7 0 0014 0C19 10.5 16 7 12 2z" /></svg>);
}
function DropletIcon() {
  return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" /></svg>);
}
function WindIcon() {
  return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1111 8H2M12.59 19.41A2 2 0 1014 16H2M17.73 7.73A2.5 2.5 0 1119.5 12H2" /></svg>);
}
function ThermometerIcon() {
  return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" /></svg>);
}
function ActivityIcon() {
  return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>);
}
function ScaleIcon() {
  return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5M8 3H3v5M12 22v-8M3 12h18" /><circle cx="12" cy="12" r="2" /></svg>);
}
function BatteryIcon() {
  return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="6" width="18" height="12" rx="2" /><path d="M23 13v-2" /></svg>);
}
