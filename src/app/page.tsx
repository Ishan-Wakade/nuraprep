import Link from "next/link";

const principles = [
  {
    number: "01",
    title: "Find the real gap",
    body: "A focused diagnostic separates a missed topic from a missing prerequisite, so the next step is useful.",
  },
  {
    number: "02",
    title: "Practice with purpose",
    body: "Choose a topic or let adaptive practice balance weak skills, recency, confidence, and question variety.",
  },
  {
    number: "03",
    title: "Learn from every answer",
    body: "Worked solutions, distractor rationales, and hint-first tutoring turn mistakes into specific lessons.",
  },
];

const topics = [
  "Arithmetic",
  "Fractions & decimals",
  "Percentages",
  "Ratios & proportions",
  "Algebra",
  "Measurement",
  "Geometry",
  "Data interpretation",
  "Probability & statistics",
];

const qualityChecks = [
  "Programmatic answer verification",
  "Ambiguity and distractor checks",
  "Source and license provenance",
  "Versioned human review",
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
      <path
        d="M3 8h9M8.5 3.5 13 8l-4.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20">
      <path
        d="m5 10 3 3 7-7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1}>
      <header className="site-header">
        <div className="shell nav-row">
          <Link className="brand" href="/" aria-label="NuraPrep home">
            <span className="brand-mark" aria-hidden="true">
              N
            </span>
            <span>NuraPrep</span>
            <span className="beta-badge">Math</span>
          </Link>
          <nav aria-label="Primary navigation">
            <a href="#approach">Approach</a>
            <a href="#quality">Question quality</a>
            <a href="#scope">Math scope</a>
          </nav>
          <a className="nav-cta" href="#roadmap">
            View roadmap
          </a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-grid shell">
          <div className="hero-copy">
            <div className="eyebrow">
              <span />
              Independent TEAS Math preparation
            </div>
            <h1>
              Know what to study <em>next.</em>
            </h1>
            <p className="hero-lede">
              Focused practice that diagnoses weak skills, explains every
              answer, and makes progress honest and understandable.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/practice">
                Open Math practice <ArrowIcon />
              </Link>
              <a
                className="button button-secondary"
                href="https://github.com/Ishan-Wakade/nuraprep"
              >
                View on GitHub
              </a>
            </div>
            <p className="build-note">
              <span aria-hidden="true" />
              Currently in active development · Math first · No affiliation with
              ATI
            </p>
          </div>

          <div
            className="preview-wrap"
            aria-label="Illustrative NuraPrep dashboard preview"
          >
            <div className="preview-glow" />
            <div className="preview-card">
              <div className="preview-topbar">
                <div>
                  <span className="preview-kicker">Illustrative preview</span>
                  <h2>Your Math plan</h2>
                </div>
                <div className="avatar" aria-label="Example learner initials">
                  IW
                </div>
              </div>
              <div className="readiness-card">
                <div className="readiness-copy">
                  <span>Learning readiness</span>
                  <strong>Building foundations</strong>
                  <small>Example state · not an ATI score</small>
                </div>
                <div className="ring" aria-hidden="true">
                  <span>68</span>
                </div>
              </div>
              <div className="focus-heading">
                <div>
                  <span>Recommended focus</span>
                  <strong>Fractions & percentages</strong>
                </div>
                <span className="time-pill">12 min</span>
              </div>
              <div className="skill-list">
                <div className="skill-row">
                  <span className="skill-icon fraction" aria-hidden="true">
                    ¾
                  </span>
                  <div>
                    <strong>Convert between forms</strong>
                    <span>3 focused questions</span>
                  </div>
                  <span className="row-arrow" aria-hidden="true">
                    →
                  </span>
                </div>
                <div className="skill-row">
                  <span className="skill-icon percent" aria-hidden="true">
                    %
                  </span>
                  <div>
                    <strong>Percent change</strong>
                    <span>Review one misconception</span>
                  </div>
                  <span className="row-arrow" aria-hidden="true">
                    →
                  </span>
                </div>
              </div>
              <div className="preview-footer">
                <span>
                  <i /> Review due today
                </span>
                <strong>2 skills</strong>
              </div>
            </div>
            <div className="mini-card mini-card-top">
              <span className="mini-icon">✓</span>
              <div>
                <strong>Answer verified</strong>
                <span>Checked step by step</span>
              </div>
            </div>
            <div className="mini-card mini-card-bottom">
              <span className="mini-icon warm">↗</span>
              <div>
                <strong>Clear next step</strong>
                <span>Chosen from skill evidence</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Product principles">
        <div className="shell trust-grid">
          <div>
            <span className="trust-symbol">∑</span>
            <p>
              <strong>Math first</strong>
              <br />
              One section, done carefully
            </p>
          </div>
          <div>
            <span className="trust-symbol">◇</span>
            <p>
              <strong>Transparent estimates</strong>
              <br />
              Evidence and uncertainty shown
            </p>
          </div>
          <div>
            <span className="trust-symbol">◎</span>
            <p>
              <strong>Review before release</strong>
              <br />
              Human approval for every item
            </p>
          </div>
          <div>
            <span className="trust-symbol">↗</span>
            <p>
              <strong>Built to adapt</strong>
              <br />
              Practice follows learner needs
            </p>
          </div>
        </div>
      </section>

      <section className="section shell" id="approach">
        <div className="section-heading centered">
          <span className="section-label">The learning loop</span>
          <h2>A study plan that responds to you.</h2>
          <p>
            NuraPrep is designed to connect each answer to a skill, a
            misconception, and a useful next action.
          </p>
        </div>
        <div className="principle-grid">
          {principles.map((principle) => (
            <article className="principle-card" key={principle.number}>
              <span className="card-number">{principle.number}</span>
              <div className="card-rule" />
              <h3>{principle.title}</h3>
              <p>{principle.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="quality-section" id="quality">
        <div className="shell quality-grid">
          <div className="quality-copy">
            <span className="section-label light">Question quality</span>
            <h2>Every question should earn its place.</h2>
            <p>
              Original questions move through deterministic checks and a
              versioned reviewer workflow before a learner can see them.
            </p>
            <ul>
              {qualityChecks.map((check) => (
                <li key={check}>
                  <CheckIcon />
                  {check}
                </li>
              ))}
            </ul>
          </div>
          <div className="review-panel">
            <div className="review-header">
              <span>Reviewer console</span>
              <span className="review-status">
                <i /> Draft
              </span>
            </div>
            <div className="review-body">
              <div className="question-meta">
                <span>NUM.PCT.03</span>
                <span>Medium · 90 sec</span>
              </div>
              <p className="question-copy">
                A clinic orders 240 supply kits. If 15% are reserved for
                training, how many remain for daily use?
              </p>
              <div className="answer-row">
                <span>A</span>
                <p>36</p>
              </div>
              <div className="answer-row selected">
                <span>B</span>
                <p>204</p>
                <small>Verified</small>
              </div>
              <div className="review-checks">
                <div>
                  <CheckIcon />
                  <span>
                    <strong>Math check passed</strong>
                    <small>240 × 0.85 = 204</small>
                  </span>
                </div>
                <div>
                  <CheckIcon />
                  <span>
                    <strong>Provenance complete</strong>
                    <small>Original template v3</small>
                  </span>
                </div>
              </div>
              <div className="review-actions">
                <button type="button">Needs revision</button>
                <button className="approve" type="button">
                  Approve version
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section shell" id="scope">
        <div className="scope-grid">
          <div className="section-heading">
            <span className="section-label">Deliberately focused</span>
            <h2>Math, before everything else.</h2>
            <p>
              The first release stays narrow enough to validate content,
              learning, and review systems properly. Other TEAS sections come
              later, one at a time.
            </p>
          </div>
          <div className="topic-cloud" aria-label="Planned Math topics">
            {topics.map((topic, index) => (
              <span
                className={index < 4 ? "topic active" : "topic"}
                key={topic}
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="roadmap-section" id="roadmap">
        <div className="shell roadmap-card">
          <div>
            <span className="section-label">Open development</span>
            <h2>Follow the build from foundation to full practice.</h2>
            <p>
              The public roadmap shows what is implemented, what is planned, and
              the evidence required before each milestone is called complete.
            </p>
          </div>
          <a
            className="button button-cream"
            href="https://github.com/Ishan-Wakade/nuraprep/blob/main/docs/ROADMAP.md"
          >
            Read the roadmap <ArrowIcon />
          </a>
        </div>
      </section>

      <footer>
        <div className="shell footer-grid">
          <div>
            <Link className="brand footer-brand" href="/">
              <span className="brand-mark" aria-hidden="true">
                N
              </span>
              <span>NuraPrep</span>
            </Link>
            <p>
              Thoughtful preparation for the Math skills behind nursing-school
              readiness.
            </p>
          </div>
          <div className="footer-links">
            <a href="https://github.com/Ishan-Wakade/nuraprep">GitHub</a>
            <a href="https://github.com/Ishan-Wakade/nuraprep/blob/main/SECURITY.md">
              Security
            </a>
            <a href="https://github.com/Ishan-Wakade/nuraprep/blob/main/docs/CONTENT_GOVERNANCE.md">
              Content policy
            </a>
          </div>
        </div>
        <div className="shell legal-row">
          <p>© 2026 Ishan Wakade. MIT licensed.</p>
          <p>Independent project. Not affiliated with or endorsed by ATI.</p>
        </div>
      </footer>
    </main>
  );
}
