"use client";

import { useEffect, useRef, useState } from "react";

interface Food {
  found: boolean;
  barcode?: string;
  name?: string;
  serving?: string | null;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-white";

export default function ScanPage() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "looking" | "found" | "notfound" | "logged">("idle");
  const [food, setFood] = useState<Food | null>(null);
  const [source, setSource] = useState<string>("");
  const [cameraOn, setCameraOn] = useState(false);
  const [canScan, setCanScan] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);

  // manual-add fields (for not-found)
  const [mName, setMName] = useState("");
  const [mCal, setMCal] = useState("");
  const [mPro, setMPro] = useState("");

  useEffect(() => {
    setCanScan(typeof window !== "undefined" && "BarcodeDetector" in window);
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(barcode: string) {
    setStatus("looking");
    setCode(barcode);
    const r = await fetch(`/api/food/barcode/${barcode}`, { headers: { "X-Requested-With": "XMLHttpRequest" } });
    const j = await r.json();
    if (j?.success && j.data.food.found) {
      setFood(j.data.food);
      setSource(j.data.source);
      setStatus("found");
    } else {
      setFood({ found: false, barcode });
      setMName("");
      setStatus("notfound");
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      // @ts-expect-error BarcodeDetector is not yet in TS lib DOM types
      const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
      const tick = async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            stopCamera();
            lookup(codes[0].rawValue);
            return;
          }
        } catch {
          /* keep scanning */
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraOn(false);
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const v = videoRef.current;
    if (v?.srcObject) (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    setCameraOn(false);
  }

  async function logMeal(name: string, macros: { calories?: number | null; proteinG?: number | null; carbsG?: number | null; fatG?: number | null; fiberG?: number | null }) {
    await fetch("/api/nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ name, ...macros, mealType: "snack", date: new Date().toISOString() }),
    });
    setStatus("logged");
  }

  async function logFound() {
    if (!food) return;
    await logMeal(food.name ?? "Scanned item", {
      calories: food.calories ?? undefined,
      proteinG: food.proteinG ?? undefined,
      carbsG: food.carbsG ?? undefined,
      fatG: food.fatG ?? undefined,
      fiberG: food.fiberG ?? undefined,
    });
  }

  async function addAndRemember() {
    if (!mName.trim() || !code) return;
    const macros = {
      calories: mCal ? Number(mCal) : undefined,
      proteinG: mPro ? Number(mPro) : undefined,
    };
    // Remember it for next time.
    await fetch("/api/food/library", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ barcode: code, name: mName.trim(), ...macros }),
    });
    await logMeal(mName.trim(), macros);
  }

  function reset() {
    setStatus("idle");
    setFood(null);
    setCode("");
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Scan a food</h1>
        <p className="mt-1 text-sm text-slate-400">Look up macros by barcode, powered by Open Food Facts.</p>
      </div>

      {status === "logged" ? (
        <div className="card text-center">
          <p className="text-3xl">✓</p>
          <p className="mt-2 font-semibold text-slate-900 dark:text-white">Logged to today&apos;s meals</p>
          <button onClick={reset} className="mt-4 rounded-xl bg-accent-500 px-5 py-2 text-sm font-semibold text-white">Scan another</button>
        </div>
      ) : (
        <>
          {/* Camera */}
          {canScan && (
            <div className="card mb-4">
              {cameraOn ? (
                <>
                  <video ref={videoRef} className="mb-3 aspect-video w-full rounded-xl bg-black object-cover" muted playsInline />
                  <button onClick={stopCamera} className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Stop camera</button>
                </>
              ) : (
                <button onClick={startCamera} className="w-full rounded-xl bg-accent-500 py-3 text-sm font-semibold text-white">Scan with camera</button>
              )}
            </div>
          )}

          {/* Manual entry */}
          <div className="card mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Enter a barcode</p>
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="0123456789012" inputMode="numeric" className={inputCls} />
              <button onClick={() => code && lookup(code)} disabled={code.length < 8 || status === "looking"} className="rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white disabled:opacity-40">
                {status === "looking" ? "..." : "Look up"}
              </button>
            </div>
          </div>

          {/* Found */}
          {status === "found" && food && (
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{food.name}</p>
                  <p className="text-xs text-slate-400">{food.serving ? `Per ${food.serving}` : ""}{source === "library" ? " · from your library" : " · Open Food Facts"}</p>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{food.calories ?? "—"}<span className="text-xs text-slate-400"> kcal</span></p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Macro label="Protein" value={food.proteinG} />
                <Macro label="Carbs" value={food.carbsG} />
                <Macro label="Fat" value={food.fatG} />
              </div>
              <button onClick={logFound} className="mt-4 w-full rounded-xl bg-accent-500 py-3 text-sm font-semibold text-white">Log this meal</button>
            </div>
          )}

          {/* Not found — manual add + remember */}
          {status === "notfound" && (
            <div className="card">
              <p className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">Not in the database</p>
              <p className="mb-3 text-xs text-slate-400">Add it once and Waier will remember it for next time.</p>
              <div className="space-y-2">
                <input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Food name" className={inputCls} />
                <div className="flex gap-2">
                  <input value={mCal} onChange={(e) => setMCal(e.target.value)} placeholder="Calories" inputMode="numeric" className={inputCls} />
                  <input value={mPro} onChange={(e) => setMPro(e.target.value)} placeholder="Protein (g)" inputMode="numeric" className={inputCls} />
                </div>
                <button onClick={addAndRemember} disabled={!mName.trim()} className="w-full rounded-xl bg-accent-500 py-3 text-sm font-semibold text-white disabled:opacity-40">Log &amp; remember</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Macro({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-xl bg-slate-50 py-2 dark:bg-slate-800/60">
      <p className="text-sm font-bold text-slate-900 dark:text-white">{value ?? "—"}<span className="text-[10px] text-slate-400">g</span></p>
      <p className="text-[11px] text-slate-400">{label}</p>
    </div>
  );
}
