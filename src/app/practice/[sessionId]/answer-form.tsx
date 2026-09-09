"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import type { QuestionChoice } from "@/lib/questions/contracts";

import { submitPracticeAnswer } from "../actions";

const initialState = { status: "idle" as const, message: "" };

export function AnswerForm({
  sessionId,
  sessionItemId,
  questionType,
  choices,
  unitRequired,
  submitLabel = "Check answer",
}: {
  sessionId: string;
  sessionItemId: string;
  questionType:
    "SINGLE_CHOICE" | "MULTIPLE_SELECT" | "NUMERIC" | "ORDERED_RESPONSE";
  choices: QuestionChoice[] | null;
  unitRequired: boolean;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(
    submitPracticeAnswer,
    initialState,
  );
  const startedAt = useRef<number | null>(null);
  const elapsedInput = useRef<HTMLInputElement>(null);
  const [orderedChoices, setOrderedChoices] = useState(choices ?? []);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  function prepareSubmission() {
    if (elapsedInput.current) {
      elapsedInput.current.value = String(
        startedAt.current === null ? 0 : Date.now() - startedAt.current,
      );
    }
  }

  function moveChoice(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= orderedChoices.length) return;
    setOrderedChoices((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  return (
    <form action={action} onSubmit={prepareSubmission} className="mt-7">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="sessionItemId" value={sessionItemId} />
      <input
        ref={elapsedInput}
        type="hidden"
        name="elapsedMilliseconds"
        defaultValue="0"
      />

      {questionType === "SINGLE_CHOICE" && (
        <fieldset>
          <legend className="sr-only">Choose one answer</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {choices?.map((choice) => (
              <ChoiceControl key={choice.id} choice={choice} type="radio" />
            ))}
          </div>
        </fieldset>
      )}

      {questionType === "MULTIPLE_SELECT" && (
        <fieldset>
          <legend className="mb-3 text-xs font-semibold text-[#52676a]">
            Select every answer that applies.
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {choices?.map((choice) => (
              <ChoiceControl key={choice.id} choice={choice} type="checkbox" />
            ))}
          </div>
        </fieldset>
      )}

      {questionType === "NUMERIC" && (
        <div
          className={`grid max-w-xl gap-4 ${
            unitRequired ? "sm:grid-cols-[minmax(0,1fr)_180px]" : ""
          }`}
        >
          <label className="text-sm font-bold">
            Numeric answer
            <input
              name="numericValue"
              inputMode="decimal"
              required
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-[#cdd7d0] bg-white px-4 py-3 text-lg"
              placeholder="Example: 0.75 or 3/4"
            />
          </label>
          {unitRequired && (
            <label className="text-sm font-bold">
              Unit
              <input
                name="unit"
                required
                autoComplete="off"
                className="mt-2 w-full rounded-xl border border-[#cdd7d0] bg-white px-4 py-3 text-lg"
              />
            </label>
          )}
        </div>
      )}

      {questionType === "ORDERED_RESPONSE" && (
        <fieldset>
          <legend className="mb-3 text-xs font-semibold text-[#52676a]">
            Move the items into the requested order.
          </legend>
          <ol className="max-w-2xl space-y-3">
            {orderedChoices.map((choice, index) => (
              <li
                key={choice.id}
                className="flex items-center gap-3 rounded-xl border border-[#d4ddd7] bg-white p-3"
              >
                <input type="hidden" name="orderedItemId" value={choice.id} />
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e7f1ed] text-sm font-bold text-[#116b65]">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm">{choice.content}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveChoice(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${choice.content} up`}
                    className="rounded-lg border border-[#cdd7d0] px-3 py-2 disabled:opacity-35"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveChoice(index, 1)}
                    disabled={index === orderedChoices.length - 1}
                    aria-label={`Move ${choice.content} down`}
                    className="rounded-lg border border-[#cdd7d0] px-3 py-2 disabled:opacity-35"
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </fieldset>
      )}

      <div className="mt-7 flex flex-col gap-4 border-t border-[#dde2dd] pt-6 sm:flex-row sm:items-end sm:justify-between">
        <label className="text-xs font-bold text-[#52676a]">
          Confidence <span className="font-normal">(optional)</span>
          <select
            name="confidence"
            defaultValue=""
            className="mt-2 block rounded-lg border border-[#cdd7d0] bg-white px-3 py-2 text-sm"
          >
            <option value="">Not selected</option>
            <option value="1">1 · Guessing</option>
            <option value="2">2 · Unsure</option>
            <option value="3">3 · Somewhat sure</option>
            <option value="4">4 · Confident</option>
            <option value="5">5 · Very confident</option>
          </select>
        </label>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            disabled={pending}
            type="submit"
            className="rounded-xl bg-[#116b65] px-6 py-3 text-sm font-bold text-white shadow-sm disabled:cursor-wait disabled:opacity-50"
          >
            {pending ? "Saving…" : submitLabel}
          </button>
          <p aria-live="polite" className="text-xs text-red-700">
            {state.message}
          </p>
        </div>
      </div>
    </form>
  );
}

function ChoiceControl({
  choice,
  type,
}: {
  choice: QuestionChoice;
  type: "radio" | "checkbox";
}) {
  return (
    <label className="group flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-[#d4ddd7] bg-white px-4 py-3 has-checked:border-[#116b65] has-checked:bg-[#edf6f2]">
      <input
        type={type}
        name="choiceId"
        value={choice.id}
        className="h-4 w-4 accent-[#116b65]"
      />
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#edf1ee] text-xs font-bold text-[#47615f] group-has-checked:bg-[#116b65] group-has-checked:text-white">
        {choice.id.toLocaleUpperCase("en-US")}
      </span>
      <span className="text-sm leading-6">{choice.content}</span>
    </label>
  );
}
