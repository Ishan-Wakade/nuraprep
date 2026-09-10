import { config } from "dotenv";
import { Pool } from "pg";

import { mathDeterministicVariantTemplates } from "@/lib/generation/math-variant-templates";

config({ path: ".env.local", quiet: true });

void main();

async function main() {
  const target = parseTarget(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const result = await pool.query<{
      code: string;
      title: string;
      current_families: number;
      published_families: number;
    }>(
      `WITH leaf_skills AS (
         SELECT skill.id, skill.code, skill.title
           FROM skills AS skill
          WHERE skill.section = 'MATH'
            AND skill.active = true
            AND NOT EXISTS (
              SELECT 1 FROM skills AS child
               WHERE child.parent_skill_id = skill.id AND child.active = true
            )
       ), current_counts AS (
         SELECT version.primary_skill_id AS skill_id,
                count(DISTINCT version.question_id)::int AS current_families
           FROM question_versions AS version
           INNER JOIN questions AS question ON question.id = version.question_id
          WHERE question.internal_slug NOT LIKE 'e2e-%'
            AND version.version = (
              SELECT max(latest.version) FROM question_versions AS latest
               WHERE latest.question_id = version.question_id
            )
          GROUP BY version.primary_skill_id
       ), publication_counts AS (
         SELECT version.primary_skill_id AS skill_id,
                count(DISTINCT publication.question_id)::int AS published_families
           FROM question_publications AS publication
           INNER JOIN question_versions AS version
             ON version.id = publication.question_version_id
          WHERE publication.retired_at IS NULL
          GROUP BY version.primary_skill_id
       )
       SELECT leaf.code, leaf.title,
              coalesce(current_counts.current_families, 0)::int AS current_families,
              coalesce(publication_counts.published_families, 0)::int AS published_families
         FROM leaf_skills AS leaf
         LEFT JOIN current_counts ON current_counts.skill_id = leaf.id
         LEFT JOIN publication_counts ON publication_counts.skill_id = leaf.id
        ORDER BY leaf.code`,
    );
    const rows = result.rows.map((skill) => {
      const templates = mathDeterministicVariantTemplates.filter(
        (template) => template.targetSkillCode === skill.code,
      );
      return {
        ...skill,
        registeredTemplates: templates.length,
        declaredStructureCapacity: templates.reduce(
          (sum, template) => sum + template.structureCapacity,
          0,
        ),
        templateKeys: templates.map(
          (template) => `${template.key}@${template.version}`,
        ),
      };
    });
    const declaredStructureCapacity = rows.reduce(
      (sum, row) => sum + row.declaredStructureCapacity,
      0,
    );
    const capacityByQuestionType = Object.fromEntries(
      ["SINGLE_CHOICE", "MULTIPLE_SELECT", "NUMERIC", "ORDERED_RESPONSE"].map(
        (questionType) => [
          questionType,
          mathDeterministicVariantTemplates
            .filter((template) => template.questionType === questionType)
            .reduce((sum, template) => sum + template.structureCapacity, 0),
        ],
      ),
    );
    process.stdout.write(
      `${JSON.stringify(
        {
          target,
          targetMeaning:
            "Planning target only; it is not an approved question count or official exam requirement.",
          current: {
            latestRealFamilies: rows.reduce(
              (sum, row) => sum + row.current_families,
              0,
            ),
            activePublishedFamilies: rows.reduce(
              (sum, row) => sum + row.published_families,
              0,
            ),
          },
          registry: {
            templates: mathDeterministicVariantTemplates.length,
            declaredStructureCapacity,
            capacityGapToTarget: Math.max(
              0,
              target - declaredStructureCapacity,
            ),
            capacityByQuestionType,
            uncoveredLeafSkills: rows
              .filter((row) => row.registeredTemplates === 0)
              .map((row) => row.code),
          },
          caveat:
            "Declared structure capacity is an upper bound before validation and duplicate rejection, not a guarantee of accepted or publishable questions. A large total in one response format is not balanced coverage.",
          skills: rows,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await pool.end();
  }
}

function parseTarget(arguments_: string[]) {
  const argument = arguments_.find((value) => value !== "--");
  if (!argument) return 1_000;
  const match = argument.match(/^--target=(\d+)$/);
  const target = match ? Number(match[1]) : Number.NaN;
  if (!Number.isInteger(target) || target < 1 || target > 100_000) {
    throw new Error("target must be an integer from 1 to 100000.");
  }
  return target;
}
