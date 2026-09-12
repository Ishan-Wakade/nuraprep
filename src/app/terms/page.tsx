import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for using the NuraPrep Math MVP.",
};

export default function TermsPage() {
  return (
    <main className="legal-page" id="main-content" tabIndex={-1}>
      <article className="legal-document">
        <Link className="legal-back" href="/">
          ← Back to NuraPrep
        </Link>
        <h1>Terms of use</h1>
        <p className="legal-updated">Effective September 12, 2026</p>

        <section>
          <h2>Independent educational tool</h2>
          <p>
            NuraPrep is an independent TEAS Math preparation project. It is not
            affiliated with, sponsored by, or endorsed by ATI. TEAS is a
            trademark of its owner. NuraPrep questions are original practice
            material and are not actual ATI exam questions.
          </p>
        </section>

        <section>
          <h2>No score guarantee</h2>
          <p>
            Readiness and score estimates are informational, unofficial, and
            uncertain. They are not ATI scores and do not guarantee admission,
            passing performance, or any particular exam result. Learners remain
            responsible for checking current official exam policies and content
            outlines.
          </p>
        </section>

        <section>
          <h2>Acceptable use</h2>
          <p>
            You may use the service for personal study and provide good-faith
            feedback. Do not disrupt the service, bypass access controls,
            automate abusive traffic, impersonate another person, or use the
            application to distribute stolen or confidential test material.
          </p>
        </section>

        <section>
          <h2>Accounts and availability</h2>
          <p>
            You are responsible for activity associated with your account.
            Access may be limited when needed to protect learners or the
            service. This is an actively developed MVP and features may change,
            experience interruptions, or be withdrawn. The current release does
            not process payments.
          </p>
        </section>

        <section>
          <h2>Content feedback</h2>
          <p>
            Mathematical or editorial errors should be reported through the
            in-product question report flow. Reports support a controlled review
            process; they do not automatically alter published questions.
          </p>
        </section>

        <section>
          <h2>Open-source code and contact</h2>
          <p>
            Repository code is available under its stated MIT license. These
            terms govern use of the hosted service, not third-party services or
            separately licensed materials. Contact the project through its{" "}
            <a href="https://github.com/Ishan-Wakade/nuraprep">
              GitHub repository
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
