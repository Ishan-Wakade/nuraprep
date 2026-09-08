"use client";

import Link from "next/link";

const colors = {
  ink: "#123136",
  softInk: "#405b5e",
  teal: "#116b65",
  paper: "#fffdf8",
  cream: "#f6f1e8",
  line: "#dcd9cf",
};

export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: colors.cream,
          color: colors.ink,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <title>NuraPrep | Something went wrong</title>
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "48px 24px",
          }}
        >
          <section
            aria-labelledby="global-error-heading"
            style={{
              width: "min(100%, 560px)",
              boxSizing: "border-box",
              border: `1px solid ${colors.line}`,
              borderRadius: 24,
              background: colors.paper,
              padding: 40,
              boxShadow: "0 24px 70px rgba(18, 49, 54, 0.10)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: colors.teal,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              NuraPrep
            </p>
            <h1
              id="global-error-heading"
              style={{ margin: "12px 0 0", fontSize: 36, lineHeight: 1.12 }}
            >
              Something interrupted the application.
            </h1>
            <p
              role="alert"
              style={{
                margin: "18px 0 0",
                color: colors.softInk,
                fontSize: 16,
                lineHeight: 1.7,
              }}
            >
              Try once more. If the problem continues, return home and reopen
              your activity.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 28,
              }}
            >
              <button
                type="button"
                onClick={retry}
                style={{
                  border: 0,
                  borderRadius: 10,
                  background: colors.teal,
                  color: "white",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "12px 18px",
                }}
              >
                Try again
              </button>
              <Link
                href="/"
                style={{
                  border: `1px solid ${colors.line}`,
                  borderRadius: 10,
                  color: colors.ink,
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "12px 18px",
                  textDecoration: "none",
                }}
              >
                Return home
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
