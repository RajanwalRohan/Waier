"use client";

/**
 * The Orb: Waier's daily engagement object. A circular, faceted glass vessel
 * that fills with luminous light (not water, to avoid hydration confusion) as
 * the day's targets are met. The Bubble — the streak — wraps the Orb as a
 * glowing ring and shows the day count. The headline Flow score sits at center.
 *
 * Purely presentational. All numbers are passed in.
 */

interface OrbProps {
  /** Today's Orb fill, 0-100. */
  fillPct: number;
  /** Headline Flow score, 0-1000. */
  flow: number;
  /** Rank label, e.g. "Rapid III". */
  rankLabel: string;
  /** Bubble streak in days. */
  bubbleDays: number;
  /** Show a calibrating state instead of a hard number. */
  calibrating?: boolean;
}

const SIZE = 220;
const CENTER = SIZE / 2;
const ORB_R = 84;
const RING_R = 100;

export function Orb({ fillPct, flow, rankLabel, bubbleDays, calibrating }: OrbProps) {
  const fill = Math.max(0, Math.min(100, fillPct));
  // Liquid-light surface: top edge of the fill, measured from the orb's top.
  const surfaceY = CENTER + ORB_R - (2 * ORB_R * fill) / 100;
  const ringC = 2 * Math.PI * RING_R;
  // The Bubble ring grows toward a full loop as the streak approaches 30 days.
  const ringProgress = Math.min(1, bubbleDays / 30);

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="overflow-visible">
        <defs>
          <radialGradient id="orbGlow" cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#8b5cf6" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.9" />
          </radialGradient>
          <linearGradient id="orbFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.95" />
          </linearGradient>
          <clipPath id="orbClip">
            <circle cx={CENTER} cy={CENTER} r={ORB_R} />
          </clipPath>
          <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Orb shell */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={ORB_R}
          className="fill-slate-100 dark:fill-slate-800/60"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="1"
        />

        {/* Luminous fill rising from the bottom */}
        <g clipPath="url(#orbClip)">
          <rect
            x={CENTER - ORB_R}
            y={surfaceY}
            width={ORB_R * 2}
            height={CENTER + ORB_R - surfaceY}
            fill="url(#orbFill)"
            style={{ transition: "y 0.8s ease, height 0.8s ease" }}
          />
          {/* Soft top-light sheen */}
          <ellipse cx={CENTER} cy={CENTER - ORB_R * 0.45} rx={ORB_R * 0.6} ry={ORB_R * 0.28} fill="url(#orbGlow)" opacity={0.25} />
        </g>

        {/* The Bubble — streak ring */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RING_R}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeWidth="4"
        />
        {bubbleDays > 0 && (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RING_R}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={ringC}
            strokeDashoffset={ringC * (1 - ringProgress)}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            filter="url(#ringGlow)"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        )}
      </svg>

      {/* Center readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {calibrating ? (
          <>
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{flow}</span>
            <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-accent-500">Calibrating</span>
          </>
        ) : (
          <>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Flow</span>
            <span className="text-5xl font-bold leading-none tracking-tight text-slate-900 dark:text-white">{flow}</span>
            <span className="mt-1.5 text-xs font-semibold text-accent-500">{rankLabel}</span>
          </>
        )}
      </div>

      {/* Bubble streak badge */}
      {bubbleDays > 0 && (
        <div className="absolute left-1/2 top-1 -translate-x-1/2 rounded-full bg-accent-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-glass">
          {bubbleDays} day{bubbleDays === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}
