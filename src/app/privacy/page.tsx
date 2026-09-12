import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How the NuraPrep Math MVP handles learner information.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page" id="main-content" tabIndex={-1}>
      <article className="legal-document">
        <Link className="legal-back" href="/">
          ← Back to NuraPrep
        </Link>
        <h1>Privacy notice</h1>
        <p className="legal-updated">Effective September 12, 2026</p>

        <section>
          <h2>What this covers</h2>
          <p>
            This notice describes the NuraPrep Math MVP, an independent study
            application operated by Ishan Wakade. NuraPrep is not affiliated
            with or endorsed by ATI.
          </p>
        </section>

        <section>
          <h2>Information we use</h2>
          <ul>
            <li>
              Account information supplied through Google sign-in, such as your
              name, email address, profile image, and provider identifier.
            </li>
            <li>
              Study activity, including answers, timing, confidence, progress,
              question reports, and review history.
            </li>
            <li>
              Limited technical and security information needed to operate the
              service, including session data and request metadata.
            </li>
          </ul>
        </section>

        <section>
          <h2>Why we use it</h2>
          <p>
            We use this information to authenticate accounts, save progress,
            personalize practice, estimate readiness, investigate content
            reports, secure the service, and improve the learning experience. We
            do not sell personal information or use learner answers for
            advertising.
          </p>
        </section>

        <section>
          <h2>Service providers</h2>
          <p>
            The MVP relies on Google for authentication, Vercel for application
            hosting, and Neon for managed PostgreSQL storage. Those providers
            process information according to their own terms and privacy
            commitments. Payment processing is not enabled in this release.
          </p>
        </section>

        <section>
          <h2>Retention and your choices</h2>
          <p>
            We retain account and study data while the account is active and as
            reasonably needed for security and operational records. You can
            export or request deletion of your account data from the account
            page. Backups and audit records may persist for a limited period
            after deletion where necessary for recovery or integrity.
          </p>
        </section>

        <section>
          <h2>Security and contact</h2>
          <p>
            No internet service can guarantee absolute security. Please report
            vulnerabilities privately using the instructions in the
            project&apos;s{" "}
            <a href="https://github.com/Ishan-Wakade/nuraprep/security/policy">
              security policy
            </a>
            . Privacy questions may be opened as a private security advisory so
            personal information is not posted publicly.
          </p>
        </section>
      </article>
    </main>
  );
}
