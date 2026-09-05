"use client";

import { useActionState } from "react";

import { startPracticeSession } from "./actions";

const initialState = { status: "idle" as const, message: "" };

export function PracticeSetupForm({
  skills,
  totalAvailable,
}: {
  skills: { skillCode: string; skillTitle: string; availableCount: number }[];
  totalAvailable: number;
}) {
  const [state, action, pending] = useActionState(
    startPracticeSession,
    initialState,
  );

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Topic">
          <select name="skillCode" defaultValue="" className={controlClass}>
            <option value="">All published topics</option>
            {skills.map((skill) => (
              <option value={skill.skillCode} key={skill.skillCode}>
                {skill.skillTitle} ({skill.availableCount})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Difficulty">
          <select name="difficulty" defaultValue="" className={controlClass}>
            <option value="">Mixed internal difficulty</option>
            <option value="FOUNDATIONAL">Foundational</option>
            <option value="DEVELOPING">Developing</option>
            <option value="PROFICIENT">Proficient</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </Field>
        <Field label="Question type">
          <select name="questionType" defaultValue="" className={controlClass}>
            <option value="">Mixed response formats</option>
            <option value="SINGLE_CHOICE">Multiple choice</option>
            <option value="MULTIPLE_SELECT">Multiple select</option>
            <option value="NUMERIC">Numeric response</option>
            <option value="ORDERED_RESPONSE">Ordered response</option>
          </select>
        </Field>
        <Field label="Number of questions">
          <select
            name="questionCount"
            defaultValue="5"
            className={controlClass}
          >
            {[1, 3, 5, 10, 15, 20].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-bold">Pacing</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <RadioCard
            name="timingMode"
            value="UNTIMED"
            title="Untimed"
            body="Focus on reasoning without a countdown."
            defaultChecked
          />
          <RadioCard
            name="timingMode"
            value="TIMED"
            title="Timed"
            body="Use the sum of reviewed item-time estimates as a pacing target."
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-bold">Question history</legend>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input name="newOnly" type="checkbox" className="h-4 w-4" />
            New questions only
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input name="missedOnly" type="checkbox" className="h-4 w-4" />
            Previously missed
          </label>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-[#dde2dd] pt-6">
        <button
          type="submit"
          disabled={pending || totalAvailable === 0}
          className="rounded-xl bg-[#116b65] px-6 py-3 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? "Building session…" : "Start practice"}
        </button>
        <p
          aria-live="polite"
          className={`text-sm ${state.status === "error" ? "text-red-700" : "text-[#587073]"}`}
        >
          {state.message ||
            `${totalAvailable} published ${totalAvailable === 1 ? "question" : "questions"} available`}
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function RadioCard({
  name,
  value,
  title,
  body,
  defaultChecked = false,
}: {
  name: string;
  value: string;
  title: string;
  body: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-[#d6ddd7] bg-white p-4 has-checked:border-[#116b65] has-checked:bg-[#edf6f2]">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4"
      />
      <span>
        <strong className="block text-sm">{title}</strong>
        <span className="mt-1 block text-xs leading-5 text-[#637679]">
          {body}
        </span>
      </span>
    </label>
  );
}

const controlClass =
  "w-full rounded-xl border border-[#cdd7d0] bg-white px-3 py-3 text-sm font-normal text-[#15383a]";
