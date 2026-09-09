"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { validatorRules } from "@/db/schema";
import { requireReviewer } from "@/lib/auth/reviewer";
import { REVIEWER_QUALITY_VALIDATORS } from "@/lib/questions/validation";

export type ValidatorRuleActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

const revisionSchema = z.object({
  key: z.enum(REVIEWER_QUALITY_VALIDATORS),
  description: z.string().trim().min(40).max(5_000),
  changeNotes: z.string().trim().min(40).max(5_000),
  invalidateEvidenceAttestation: z.literal("on"),
});

export async function createValidatorRuleRevision(
  _previous: ValidatorRuleActionState,
  formData: FormData,
): Promise<ValidatorRuleActionState> {
  const reviewer = await requireReviewer();
  const parsed = revisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid validator revision.",
    };
  }

  const database = getDatabase();
  const result = await database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${parsed.data.key}, 0))`,
    );
    const [current] = await transaction
      .select()
      .from(validatorRules)
      .where(
        and(
          eq(validatorRules.key, parsed.data.key),
          eq(validatorRules.active, true),
        ),
      )
      .for("update")
      .limit(1);
    const [latest] = await transaction
      .select({ version: validatorRules.version })
      .from(validatorRules)
      .where(eq(validatorRules.key, parsed.data.key))
      .orderBy(desc(validatorRules.version))
      .limit(1);

    if (!current || !latest) return { kind: "missing" as const };
    if (current.description.trim() === parsed.data.description) {
      return { kind: "unchanged" as const };
    }

    const activatedAt = new Date();
    await transaction
      .update(validatorRules)
      .set({ active: false, retiredAt: activatedAt, retiredBy: reviewer.id })
      .where(eq(validatorRules.id, current.id));
    const [created] = await transaction
      .insert(validatorRules)
      .values({
        key: parsed.data.key,
        version: latest.version + 1,
        description: parsed.data.description,
        blocksPublication: false,
        active: true,
        implementationHash: null,
        changeNotes: parsed.data.changeNotes,
        createdBy: reviewer.id,
        activatedAt,
      })
      .returning({ version: validatorRules.version });
    return { kind: "created" as const, version: created.version };
  });

  if (result.kind === "missing") {
    return { status: "error", message: "No active reviewer rule was found." };
  }
  if (result.kind === "unchanged") {
    return {
      status: "error",
      message: "The revised rubric must differ from the active description.",
    };
  }

  revalidatePath("/review");
  revalidatePath("/review/validators");
  return {
    status: "success",
    message: `${parsed.data.key} v${result.version} activated. Prior evidence for this rule is now stale.`,
  };
}
