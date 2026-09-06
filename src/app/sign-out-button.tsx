"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setPending(true);
    setFailed(false);

    try {
      const result = await authClient.signOut();
      if (result.error) {
        setFailed(true);
        setPending(false);
        return;
      }

      router.replace("/sign-in");
      router.refresh();
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="font-semibold text-[#116b65] underline-offset-4 hover:underline disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {failed ? (
        <p className="mt-1 text-[11px] text-[#9b3d32]" role="alert">
          Sign-out failed. Try again.
        </p>
      ) : null}
    </div>
  );
}
