"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { getSessionTimerSeconds } from "@/lib/practice/timing";

import { expirePracticeTestSession } from "../actions";

const initialState = { status: "idle" as const, message: "" };

export function SessionTimer({
  startedAt,
  timeLimitSeconds,
  sessionId,
  expireOnZero = false,
}: {
  startedAt: string;
  timeLimitSeconds: number | null;
  sessionId: string;
  expireOnZero?: boolean;
}) {
  const [seconds, setSeconds] = useState<number | null>(null);
  const [expiryState, expiryAction, expiryPending] = useActionState(
    expirePracticeTestSession,
    initialState,
  );
  const expiryForm = useRef<HTMLFormElement>(null);
  const expirySubmitted = useRef(false);

  useEffect(() => {
    function update() {
      const startedAtMilliseconds = new Date(startedAt).getTime();
      const currentSeconds = getSessionTimerSeconds({
        startedAtMilliseconds,
        timeLimitSeconds,
        nowMilliseconds: Date.now(),
      });
      setSeconds(currentSeconds);
      if (
        expireOnZero &&
        timeLimitSeconds !== null &&
        currentSeconds === 0 &&
        !expirySubmitted.current
      ) {
        expirySubmitted.current = true;
        expiryForm.current?.requestSubmit();
      }
    }

    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [expireOnZero, startedAt, timeLimitSeconds]);

  const minutes = Math.floor((seconds ?? 0) / 60);
  const remainder = (seconds ?? 0) % 60;

  return (
    <>
      <div className="rounded-xl border border-[#d5ddd7] bg-[#fffdf8] px-4 py-3 text-right">
        <span className="block text-[10px] font-bold tracking-[0.12em] text-[#52676a] uppercase">
          {timeLimitSeconds === null ? "Elapsed" : "Time left"}
        </span>
        <strong className="mt-1 block font-mono text-lg tabular-nums">
          {expiryPending
            ? "Ending…"
            : seconds === null
              ? "--:--"
              : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`}
        </strong>
        {expiryState.status === "error" && (
          <span className="mt-1 block text-xs text-red-700">
            {expiryState.message}
          </span>
        )}
      </div>
      {expireOnZero && (
        <form ref={expiryForm} action={expiryAction} className="hidden">
          <input type="hidden" name="sessionId" value={sessionId} />
        </form>
      )}
    </>
  );
}
