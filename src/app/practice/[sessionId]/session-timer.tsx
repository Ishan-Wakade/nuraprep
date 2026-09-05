"use client";

import { useEffect, useState } from "react";

export function SessionTimer({
  startedAt,
  timeLimitSeconds,
}: {
  startedAt: string;
  timeLimitSeconds: number | null;
}) {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    function update() {
      const elapsed = Math.max(
        0,
        Math.floor((Date.now() - new Date(startedAt).getTime()) / 1_000),
      );
      setSeconds(
        timeLimitSeconds === null
          ? elapsed
          : Math.max(0, timeLimitSeconds - elapsed),
      );
    }

    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [startedAt, timeLimitSeconds]);

  const minutes = Math.floor((seconds ?? 0) / 60);
  const remainder = (seconds ?? 0) % 60;

  return (
    <div className="rounded-xl border border-[#d5ddd7] bg-[#fffdf8] px-4 py-3 text-right">
      <span className="block text-[10px] font-bold tracking-[0.12em] text-[#687a7c] uppercase">
        {timeLimitSeconds === null ? "Elapsed" : "Pacing time left"}
      </span>
      <strong className="mt-1 block font-mono text-lg tabular-nums">
        {seconds === null
          ? "--:--"
          : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`}
      </strong>
    </div>
  );
}
