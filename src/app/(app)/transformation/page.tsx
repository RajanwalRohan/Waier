"use client";

import { useEffect, useRef, useState } from "react";

interface PhotoMeta {
  id: string;
  date: string;
}

/** Fetches a single photo's image data through the auth-gated route. */
function PhotoImg({ id, className, alt }: { id: string; className?: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/photos/${id}`, { headers: { "X-Requested-With": "XMLHttpRequest" } })
      .then((r) => r.json())
      .then((j) => !cancelled && j?.success && setSrc(j.data.dataUrl))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);
  if (!src) return <div className={`${className ?? ""} animate-pulse bg-slate-200 dark:bg-slate-800`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} className={className} alt={alt} />;
}

export default function TransformationPage() {
  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [slide, setSlide] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await fetch("/api/photos?kind=body", { headers: { "X-Requested-With": "XMLHttpRequest" } });
    const j = await r.json();
    if (j?.success) setPhotos(j.data.photos as PhotoMeta[]);
  }
  useEffect(() => {
    load();
  }, []);

  // Slideshow ticker
  useEffect(() => {
    if (!playing || photos.length === 0) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % photos.length), 700);
    return () => clearInterval(t);
  }, [playing, photos.length]);

  function pickFile() {
    fileRef.current?.click();
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 800;
        let { width, height } = img;
        if (width > height && width > max) {
          height = (height * max) / width;
          width = max;
        } else if (height > max) {
          width = (width * max) / height;
          height = max;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
        upload(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function upload(dataUrl: string) {
    setUploading(true);
    try {
      await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ dataUrl, kind: "body" }),
      });
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    setPhotos((p) => p.filter((x) => x.id !== id));
    await fetch(`/api/photos?id=${id}`, { method: "DELETE", headers: { "X-Requested-With": "XMLHttpRequest" } });
  }

  const latest = photos[photos.length - 1];

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Transformation</h1>
        <p className="mt-1 text-sm text-slate-400">A private daily photo. Only you ever see these.</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {/* Capture with ghost-overlay pose guide */}
      <div className="card mb-6">
        <div className="relative mx-auto mb-4 flex aspect-[3/4] w-48 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
          {latest ? (
            <>
              <div className="absolute inset-0 opacity-30">
                <PhotoImg id={latest.id} className="h-full w-full object-cover" alt="Yesterday's pose guide" />
              </div>
              <span className="relative z-10 px-3 text-center text-[11px] font-medium text-slate-500 dark:text-slate-300">
                Line up with your last photo
              </span>
            </>
          ) : (
            <span className="px-3 text-center text-xs text-slate-400">Your first photo starts the timeline</span>
          )}
        </div>
        <button
          onClick={pickFile}
          disabled={uploading}
          className="w-full rounded-xl bg-accent-500 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {uploading ? "Saving..." : latest ? "Add today's photo" : "Take your first photo"}
        </button>
      </div>

      {/* Slideshow */}
      {photos.length >= 2 && (
        <div className="card mb-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Transformation reel</p>
            <button onClick={() => { setSlide(0); setPlaying((p) => !p); }} className="text-sm font-semibold text-accent-500">
              {playing ? "Pause" : "Play"}
            </button>
          </div>
          <div className="mx-auto flex aspect-[3/4] w-56 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
            <PhotoImg id={photos[Math.min(slide, photos.length - 1)].id} className="h-full w-full object-cover" alt="Transformation frame" />
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">{photos[Math.min(slide, photos.length - 1)].date}</p>
        </div>
      )}

      {/* Timeline */}
      {photos.length > 0 && (
        <div className="card">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Timeline</p>
          <div className="grid grid-cols-3 gap-2">
            {photos.slice().reverse().map((p) => (
              <div key={p.id} className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                <PhotoImg id={p.id} className="h-full w-full object-cover" alt={`Photo from ${p.date}`} />
                <button
                  onClick={() => remove(p.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/50 px-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Delete photo"
                >
                  ✕
                </button>
                <span className="absolute bottom-1 left-1 rounded bg-black/40 px-1 text-[10px] text-white">{p.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
        Photos are private to your account, never shown to friends or used in rankings, and excluded from any shared Wrapped by default.
      </p>
    </div>
  );
}
