"use client";

import { useActionState } from "react";

import {
  generateScoreEstimate,
  type ScoreActionState,
  updateStudyPlan,
  updateStudyPlanItem,
} from "./actions";

const initialState: ScoreActionState = { status: "idle", message: "" };
const controlClass =
  "rounded-lg border border-[#c8d3cc] bg-white px-3 py-2 text-sm";

export function GenerateEstimateButton({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(
    generateScoreEstimate,
    initialState,
  );
  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className={
          compact ? "button button-secondary" : "button button-primary"
        }
      >
        {pending
          ? "Calculating…"
          : compact
            ? "Refresh estimate"
            : "Create estimate"}
      </button>
      <p aria-live="polite" className="mt-2 text-sm text-red-700">
        {state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}

export function StudyPlanItemForm({
  item,
}: {
  item: {
    id: string;
    status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
    targetMinutes: number;
  };
}) {
  const [state, action, pending] = useActionState(
    updateStudyPlanItem,
    initialState,
  );
  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
      <input type="hidden" name="itemId" value={item.id} />
      <label className="text-xs font-bold text-[#47615f]">
        Status
        <select
          name="status"
          defaultValue={item.status}
          className={`mt-1 block ${controlClass}`}
        >
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="SKIPPED">Skipped</option>
        </select>
      </label>
      <label className="text-xs font-bold text-[#47615f]">
        Minutes/week
        <input
          name="targetMinutes"
          type="number"
          min="10"
          max="600"
          defaultValue={item.targetMinutes}
          className={`mt-1 block w-28 ${controlClass}`}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[#15383a] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save item"}
      </button>
      <p
        aria-live="polite"
        className={`w-full text-xs ${state.status === "error" ? "text-red-700" : "text-[#116b65]"}`}
      >
        {state.message}
      </p>
    </form>
  );
}

export function StudyPlanPreferencesForm({
  planId,
  weeklyMinutes,
  learnerNotes,
}: {
  planId: string;
  weeklyMinutes: number;
  learnerNotes: string | null;
}) {
  const [state, action, pending] = useActionState(
    updateStudyPlan,
    initialState,
  );
  return (
    <form
      action={action}
      className="mt-5 grid gap-4 border-t border-[#d6ddd7] pt-5"
    >
      <input type="hidden" name="planId" value={planId} />
      <label className="text-sm font-bold">
        Total weekly study budget
        <input
          name="weeklyMinutes"
          type="number"
          min="30"
          max="1200"
          defaultValue={weeklyMinutes}
          className={`mt-2 block w-36 ${controlClass}`}
        />
      </label>
      <label className="text-sm font-bold">
        Personal notes
        <textarea
          name="learnerNotes"
          rows={3}
          maxLength={2000}
          defaultValue={learnerNotes ?? ""}
          placeholder="Add schedule constraints or a reminder for your next study session."
          className={`mt-2 block w-full font-normal ${controlClass}`}
        />
      </label>
      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-[#aebdb6] bg-white px-4 py-2 text-sm font-bold disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save plan preferences"}
        </button>
      </div>
      <p
        aria-live="polite"
        className={`text-xs ${state.status === "error" ? "text-red-700" : "text-[#116b65]"}`}
      >
        {state.message}
      </p>
    </form>
  );
}
