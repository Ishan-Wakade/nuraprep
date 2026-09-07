import { getValidatorRuleRegistry } from "@/data/content-governance";
import { REVIEWER_PUBLICATION_VALIDATORS } from "@/lib/questions/validation";

import { ValidatorRuleRevisionForm } from "./validator-rule-form";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export default async function ValidatorRuleRegistryPage() {
  const rules = await getValidatorRuleRegistry();
  const activeRules = rules.filter((rule) => rule.active);

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-bold tracking-[0.14em] text-[#116b65] uppercase">
        Publication governance
      </p>
      <h1 className="mt-2 font-serif text-4xl tracking-[-0.03em]">
        Validator rule registry
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5b7073]">
        Only the active version of each rule can satisfy publication. Activating
        a revised reviewer rubric retires its predecessor and makes every prior
        pass for that rule stale until the exact question version is reviewed
        again.
      </p>

      <section className="mt-7 grid gap-4" aria-label="Active validator rules">
        {activeRules.map((rule) => {
          const reviewerManaged = REVIEWER_PUBLICATION_VALIDATORS.includes(
            rule.key as (typeof REVIEWER_PUBLICATION_VALIDATORS)[number],
          );
          const history = rules.filter(
            (candidate) => candidate.key === rule.key && !candidate.active,
          );
          return (
            <article
              key={rule.id}
              className="rounded-2xl border border-[#d8ded9] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">
                    {rule.key} v{rule.version}
                  </h2>
                  <p className="mt-1 text-xs text-[#52676a]">
                    Active since{" "}
                    {dateFormatter.format(new Date(rule.activatedAt))}·{" "}
                    {rule.evidenceCount} evidence runs
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800 uppercase">
                  Active
                </span>
              </div>
              <p className="mt-4 text-sm leading-6">{rule.description}</p>
              {reviewerManaged ? (
                <ValidatorRuleRevisionForm
                  ruleKey={rule.key}
                  currentVersion={rule.version}
                  currentDescription={rule.description}
                />
              ) : (
                <p className="mt-4 rounded-lg bg-[#edf3ef] px-3 py-2 text-xs text-[#52676a]">
                  Automated rule revisions require a matching implementation and
                  test change in code; they cannot be activated here.
                </p>
              )}
              {history.length > 0 && (
                <details className="mt-4 border-t border-[#e0e5e1] pt-4 text-xs text-[#52676a]">
                  <summary className="cursor-pointer font-bold">
                    Retired versions ({history.length})
                  </summary>
                  <ol className="mt-3 space-y-3">
                    {history.map((pastRule) => (
                      <li
                        key={pastRule.id}
                        className="rounded-lg border border-[#e0e5e1] bg-[#faf9f4] p-3"
                      >
                        <strong>v{pastRule.version}</strong> · retired by{" "}
                        {pastRule.retiredBy ?? "unknown"} on{" "}
                        {pastRule.retiredAt
                          ? dateFormatter.format(new Date(pastRule.retiredAt))
                          : "unknown date"}
                        <p className="mt-2 leading-5">{pastRule.description}</p>
                        <p className="mt-2 font-semibold">
                          Change record: {pastRule.changeNotes}
                        </p>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
