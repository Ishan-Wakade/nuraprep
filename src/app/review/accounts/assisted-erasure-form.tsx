"use client";

import { useActionState } from "react";

import {
  pseudonymizePrivilegedAccount,
  type AssistedErasureState,
} from "./actions";

const initialState: AssistedErasureState = { status: "idle", message: "" };

export function AssistedErasureForm({
  targetUserId,
  targetEmail,
}: {
  targetUserId: string;
  targetEmail: string;
}) {
  const targetAction = pseudonymizePrivilegedAccount.bind(null, targetUserId);
  const [state, action, pending] = useActionState(targetAction, initialState);

  return (
    <form
      action={action}
      className="mt-4 grid gap-3 border-t border-[#ead8ba] pt-4"
    >
      <label className="text-xs font-bold text-[#5f5546]">
        Type {targetEmail} exactly
        <input
          name="confirmationEmail"
          type="email"
          required
          autoComplete="off"
          spellCheck={false}
          className="mt-1.5 block min-h-11 w-full rounded-xl border border-[#c9ad82] bg-white px-3 py-2 text-sm font-normal text-[#293f41] outline-none focus:border-[#9b3d32] focus:ring-2 focus:ring-[#9b3d32]/20"
        />
      </label>
      <label className="text-xs font-bold text-[#5f5546]">
        Administrative reason (do not include unnecessary personal data)
        <textarea
          name="reason"
          required
          minLength={20}
          maxLength={500}
          rows={3}
          className="mt-1.5 block w-full rounded-xl border border-[#c9ad82] bg-white px-3 py-2 text-sm font-normal text-[#293f41] outline-none focus:border-[#9b3d32] focus:ring-2 focus:ring-[#9b3d32]/20"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 justify-self-start rounded-xl bg-[#9b3d32] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#7f3028] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Pseudonymizing…" : "Pseudonymize account"}
      </button>
      <p
        aria-live="assertive"
        className={`text-xs leading-5 ${state.status === "success" ? "text-[#116b65]" : "text-[#9b3d32]"}`}
      >
        {state.message}
      </p>
    </form>
  );
}
