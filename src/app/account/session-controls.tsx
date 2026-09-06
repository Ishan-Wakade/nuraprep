"use client";

import { useActionState } from "react";

import { revokeOtherSessions, type AccountActionState } from "./actions";

const initialState: AccountActionState = { status: "idle", message: "" };

export function SessionControls({
  otherSessionCount,
}: {
  otherSessionCount: number;
}) {
  const [state, action, pending] = useActionState(
    revokeOtherSessions,
    initialState,
  );

  return (
    <form action={action} className="mt-5 border-t border-[#d6ddd7] pt-5">
      <button
        type="submit"
        disabled={pending || otherSessionCount === 0}
        className="min-h-11 rounded-xl border border-[#aebdb6] bg-white px-4 py-2.5 text-sm font-bold text-[#15383a] transition hover:border-[#116b65] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Signing out other devices…" : "Sign out other devices"}
      </button>
      <p
        aria-live="polite"
        className={`mt-2 text-xs ${state.status === "error" ? "text-red-700" : "text-[#116b65]"}`}
      >
        {state.message ||
          (otherSessionCount === 0
            ? "This is your only active session."
            : `${otherSessionCount} other active ${otherSessionCount === 1 ? "session" : "sessions"}.`)}
      </p>
    </form>
  );
}
