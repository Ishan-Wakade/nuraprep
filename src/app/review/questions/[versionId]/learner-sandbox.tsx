"use client";

import { useMemo, useState } from "react";

import type {
  AnswerSpec,
  LearnerAnswer,
  QuestionChoice,
} from "@/lib/questions/contracts";
import { evaluateAnswer } from "@/lib/questions/validation";

type SandboxResult = ReturnType<typeof evaluateAnswer> | null;
type SandboxFailureReason = ReturnType<typeof evaluateAnswer>["reason"];

export function LearnerSandbox({
  answerSpec,
  choices,
}: {
  answerSpec: AnswerSpec;
  choices: QuestionChoice[] | null;
}) {
  const initialOrder = useMemo(
    () => choices?.map((choice) => choice.id) ?? [],
    [choices],
  );
  const [singleChoice, setSingleChoice] = useState("");
  const [multipleChoices, setMultipleChoices] = useState<string[]>([]);
  const [numericValue, setNumericValue] = useState("");
  const [numericUnit, setNumericUnit] = useState("");
  const [orderedIds, setOrderedIds] = useState(initialOrder);
  const [result, setResult] = useState<SandboxResult>(null);

  function clearResult() {
    setResult(null);
  }

  function submitSandboxAnswer() {
    const submitted = buildAnswer();
    if (!submitted) return;
    setResult(evaluateAnswer(answerSpec, submitted));
  }

  function buildAnswer(): LearnerAnswer | undefined {
    if (answerSpec.type === "single_choice") {
      return singleChoice
        ? { type: "single_choice", choiceId: singleChoice }
        : undefined;
    }
    if (answerSpec.type === "multiple_select") {
      return multipleChoices.length
        ? { type: "multiple_select", choiceIds: multipleChoices }
        : undefined;
    }
    if (answerSpec.type === "numeric") {
      return numericValue.trim()
        ? {
            type: "numeric",
            value: numericValue,
            unit: numericUnit.trim() || undefined,
          }
        : undefined;
    }
    return orderedIds.length
      ? { type: "ordered_response", itemIds: orderedIds }
      : undefined;
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= orderedIds.length) return;
    const next = [...orderedIds];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOrderedIds(next);
    clearResult();
  }

  const canCheck = Boolean(buildAnswer());

  return (
    <div className="mt-5 rounded-xl border border-[#c9d9d3] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold">Interactive answer sandbox</h3>
          <p className="mt-1 text-xs leading-5 text-[#52676a]">
            Try the learner interaction and verify the keyed response. Sandbox
            answers stay in this browser and are not saved as learner attempts.
          </p>
        </div>
        <span className="rounded-full bg-[#edf3ef] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#47615f] uppercase">
          No-write preview
        </span>
      </div>

      {(answerSpec.type === "single_choice" ||
        answerSpec.type === "multiple_select") && (
        <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Answer choices</legend>
          {(choices ?? []).map((choice) => {
            const multiple = answerSpec.type === "multiple_select";
            const checked = multiple
              ? multipleChoices.includes(choice.id)
              : singleChoice === choice.id;
            return (
              <label
                key={choice.id}
                className={`flex cursor-pointer gap-3 rounded-xl border px-4 py-3 text-sm ${checked ? "border-[#116b65] bg-[#e8f3ef]" : "border-[#d8ded9] bg-[#fafbf8]"}`}
              >
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name="sandbox-choice"
                  value={choice.id}
                  checked={checked}
                  onChange={(event) => {
                    if (multiple) {
                      setMultipleChoices((current) =>
                        event.target.checked
                          ? [...current, choice.id]
                          : current.filter((id) => id !== choice.id),
                      );
                    } else {
                      setSingleChoice(choice.id);
                    }
                    clearResult();
                  }}
                />
                <span>
                  <strong className="mr-2 text-[#116b65]">
                    {choice.id.toUpperCase()}.
                  </strong>
                  {choice.content}
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      {answerSpec.type === "numeric" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
          <label className="text-xs font-bold text-[#52676a]">
            Numeric answer
            <input
              aria-label="Sandbox numeric answer"
              inputMode="decimal"
              value={numericValue}
              onChange={(event) => {
                setNumericValue(event.target.value);
                clearResult();
              }}
              className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
              placeholder="Enter a number"
            />
          </label>
          {answerSpec.unitRequired && (
            <label className="text-xs font-bold text-[#52676a]">
              Unit (required)
              <input
                aria-label="Sandbox answer unit"
                value={numericUnit}
                onChange={(event) => {
                  setNumericUnit(event.target.value);
                  clearResult();
                }}
                className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
                placeholder={answerSpec.unit ?? "Unit"}
              />
            </label>
          )}
        </div>
      )}

      {answerSpec.type === "ordered_response" && (
        <ol className="mt-4 space-y-2" aria-label="Ordered response items">
          {orderedIds.map((id, index) => {
            const choice = choices?.find((item) => item.id === id);
            return (
              <li
                key={id}
                className="flex items-center gap-3 rounded-xl border border-[#d8ded9] bg-[#fafbf8] px-3 py-2.5"
              >
                <span className="w-6 text-center text-xs font-bold text-[#116b65]">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  {choice?.content ?? id}
                </span>
                <button
                  type="button"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${choice?.content ?? id} up`}
                  className="rounded-lg border border-[#ccd5d0] px-2 py-1 text-xs font-bold disabled:opacity-35"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === orderedIds.length - 1}
                  aria-label={`Move ${choice?.content ?? id} down`}
                  className="rounded-lg border border-[#ccd5d0] px-2 py-1 text-xs font-bold disabled:opacity-35"
                >
                  ↓
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canCheck}
          onClick={submitSandboxAnswer}
          className="rounded-lg bg-[#116b65] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          Check sandbox answer
        </button>
        {result && (
          <p
            role="status"
            className={`text-sm font-bold ${result.correct ? "text-emerald-700" : "text-red-700"}`}
          >
            {result.correct
              ? "Correct—the stored answer contract accepts this response."
              : sandboxFailureMessage(result.reason)}
          </p>
        )}
      </div>
    </div>
  );
}

function sandboxFailureMessage(reason: SandboxFailureReason) {
  if (reason === "INVALID_NUMBER") return "Enter a valid number.";
  if (reason === "UNIT_REQUIRED") return "The stored answer requires a unit.";
  if (reason === "UNIT_INVALID") return "That unit is not accepted.";
  return "Not accepted by the stored answer contract.";
}
