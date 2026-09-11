import type { OriginalityDocument } from "@/lib/questions/originality";

type Queryable = {
  query<T extends Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[] }>;
};

export async function loadCurrentMathCorpus(
  database: Queryable,
): Promise<OriginalityDocument[]> {
  const result = await database.query<{
    id: string;
    prompt: string;
    stimulus: OriginalityDocument["stimulus"];
    choices: { content: string }[] | null;
  }>(
    `SELECT version.id, version.prompt, version.stimulus, version.choices
       FROM question_versions AS version
       INNER JOIN questions AS question ON question.id = version.question_id
      WHERE question.section = 'MATH'
        AND question.internal_slug NOT LIKE 'e2e-%'
        AND version.version = (
          SELECT max(latest.version)
            FROM question_versions AS latest
           WHERE latest.question_id = version.question_id
        )
      ORDER BY question.internal_slug`,
  );
  return result.rows;
}
