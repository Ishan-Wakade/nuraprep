"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth/client";

export function GoogleSignInButton({ returnTo }: { returnTo: string }) {
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  async function signIn() {
    setPending(true);
    setErrorMessage(undefined);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: returnTo,
      });

      if (result.error) {
        setErrorMessage("Google sign-in could not start. Please try again.");
        setPending(false);
      }
    } catch {
      setErrorMessage("Google sign-in could not start. Please try again.");
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#116b65] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0c5a56] disabled:cursor-wait disabled:opacity-65"
      >
        <GoogleMark />
        {pending ? "Connecting securely…" : "Continue with Google"}
      </button>
      {errorMessage ? (
        <p className="mt-3 text-sm leading-6 text-[#9b3d32]" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 rounded-full bg-white p-0.5"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.2L6.5 14Z"
      />
      <path
        fill="#EA4335"
        d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z"
      />
    </svg>
  );
}
