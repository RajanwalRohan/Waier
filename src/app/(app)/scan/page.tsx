"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";

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

type Status = "scanning" | "denied" | "looking" | "found" | "notfound" | "logged";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-white";

export default function ScanPage() {
  const [status, setStatus] = useState<Status>("scanning");
  const [food, setFood] = useState<Food | null>(null);
  const [source, setSource] = useState("");
  const [code, setCode] = useState("");
  const [manual, setManual] = useState(false);

  // manual-add fields (for not-found)
  const [mName, setMName] = useState("");
  const [mCal, setMCal] = useState("");
  const [mPro, setMPro] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }

  async function startCamera() {
    stopCamera();
    setStatus("scanning");
    try {
      const reader = new BrowserMultiFormatReader();
      // Wait a tick so the <video> is mounted before we attach the stream.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (!videoRef.current) return;
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current,
        (result) => {
          if (result) {
            const text = result.getText();
            if (/^\d{8,14}$/.test(text)) {
              stopCamera();
              lookup(text);
            }
          }
        },
      );
    } catch {
      // Permission denied, no camera, or insecure context.
      setStatus("denied");
    }
  }

  useEffect(() => {
    startCamera();
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

  async function logMeal(name: string, macros: Partial<Pick<Food, "calories" | "proteinG" | "carbsG" | "fatG" | "fiberG">>) {
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
    const macros = { calories: mCal ? Number(mCal) : undefined, proteinG: mPro ? Number(mPro) : undefined };
    await fetch("/api/food/library", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ barcode: code, name: mName.trim(), ...macros }),
    });
    await logMeal(mName.trim(), macros);
  }

  function scanAgain() {
    setFood(null);
    setCode("");
    setManual(false);
    startCamera();
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Scan a food</h1>
        <p className="mt-1 text-sm text-slate-400">Point your camera at a barcode to log macros instantly.</p>
      </div>

      {/* Live camera scanner */}
      {status === "scanning" && (
        <div className="card overflow-hidden p-0">
          <div className="relative aspect-[3/4] w-full bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
            {/* Viewfinder overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-32 w-64 rounded-2xl" style={{ boxShadow: "0 0 0 100vmax rgba(0,0,0,0.45)" }}>
                <span className="absolute -left-0.5 -top-0.5 h-6 w-6 rounded-tl-2xl border-l-4 border-t-4 border-white/90" />
                <span className="absolute -right-0.5 -top-0.5 h-6 w-6 rounded-tr-2xl border-r-4 border-t-4 border-white/90" />
                <span className="absolute -bottom-0.5 -left-0.5 h-6 w-6 rounded-bl-2xl border-b-4 border-l-4 border-white/90" />
                <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-br-2xl border-b-4 border-r-4 border-white/90" />
                <span className="absolute left-2 right-2 top-1/2 h-0.5 -translate-y-1/2 bg-accent-400/80" />
              </div>
            </div>
            <p className="absolute bottom-4 left-0 right-0 text-center text-xs font-medium text-white/90" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
              Line the barcode up inside the frame
            </p>
          </div>
          <div className="p-4">
            <button onClick={() => { stopCamera(); setManual(true); setStatus("denied"); }} className="w-full text-center text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              Enter barcode manually
            </button>
          </div>
        </div>
      )}

      {/* Camera unavailable / manual entry */}
      {status === "denied" && (
        <div className="card">
          <p className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">{manual ? "Enter a barcode" : "Camera unavailable"}</p>
          <p className="mb-3 text-xs text-slate-400">
            {manual ? "Type the digits printed under the barcode." : "We could not open the camera (permission denied, or no camera on this device). You can still enter a barcode by hand."}
          </p>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="0123456789012" inputMode="numeric" className={inputCls} />
            <button onClick={() => code.length >= 8 && lookup(code)} disabled={code.length < 8} className="rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white disabled:opacity-40">Look up</button>
          </div>
          <button onClick={startCamera} className="mt-3 w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Try the camera</button>
        </div>
      )}

      {status === "looking" && <div className="card text-center text-sm text-slate-400">Looking up {code}…</div>}

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
          <button onClick={scanAgain} className="mt-2 w-full text-center text-sm font-medium text-slate-400">Scan another</button>
        </div>
      )}

      {/* Not found */}
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
            <button onClick={scanAgain} className="w-full text-center text-sm font-medium text-slate-400">Scan another</button>
          </div>
        </div>
      )}

      {/* Logged */}
      {status === "logged" && (
        <div className="card text-center">
          <p className="text-3xl">✓</p>
          <p className="mt-2 font-semibold text-slate-900 dark:text-white">Logged to today&apos;s meals</p>
          <button onClick={scanAgain} className="mt-4 rounded-xl bg-accent-500 px-5 py-2 text-sm font-semibold text-white">Scan another</button>
        </div>
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
