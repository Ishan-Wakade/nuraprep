"use client";

import { useActionState } from "react";

import { deleteAccount, type AccountActionState } from "./actions";

const initialState: AccountActionState = { status: "idle", message: "" };

export function AccountDeletionForm() {
  const [state, action, pending] = useActionState(deleteAccount, initialState);

  return (
    <form action={action} className="mt-5 max-w-xl">
      <label className="block text-xs font-bold text-[#665b49]">
        Type DELETE to confirm
        <input
          name="confirmation"
          type="text"
          required
          autoComplete="off"
          spellCheck={false}
          className="mt-2 block min-h-11 w-full rounded-xl border border-[#c9ad82] bg-white px-3 py-2 text-sm text-[#3e3a32] outline-none focus:border-[#9b3d32] focus:ring-2 focus:ring-[#9b3d32]/20"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 min-h-11 rounded-xl bg-[#9b3d32] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#7f3028] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Deleting account…" : "Permanently delete account"}
      </button>
      <p
        aria-live="assertive"
        className="mt-2 text-xs leading-5 text-[#9b3d32]"
      >
        {state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}
