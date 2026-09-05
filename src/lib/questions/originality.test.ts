import { describe, expect, it } from "vitest";

import { findInternalSimilaritySignals } from "./originality";

describe("internal originality signals", () => {
  it("blocks a numbers-only variation across question families", () => {
    const [signal] = findInternalSimilaritySignals(
      {
        id: "candidate",
        prompt:
          "A clinic packs 18 kits with 12 bandages in each kit. How many bandages are packed?",
      },
      [
        {
          id: "existing",
          prompt:
            "A clinic packs 24 kits with 16 bandages in each kit. How many bandages are packed?",
        },
      ],
    );
    expect(signal).toMatchObject({
      blocking: true,
      reason: "NUMBERS_ONLY_VARIATION",
    });
  });

  it("blocks exact text even when it is short", () => {
    const [signal] = findInternalSimilaritySignals(
      { id: "candidate", prompt: "What is 4 + 9?" },
      [{ id: "existing", prompt: "What is 4 + 9?" }],
    );
    expect(signal?.reason).toBe("EXACT_TEXT");
  });

  it("reports high phrase overlap for a lightly edited long item", () => {
    const [signal] = findInternalSimilaritySignals(
      {
        id: "candidate",
        prompt:
          "A nurse records five temperature readings during one shift. Which statement best describes the median reading?",
      },
      [
        {
          id: "existing",
          prompt:
            "A nurse records five temperature readings during one shift. Which option best describes the median reading?",
        },
      ],
    );
    expect(signal?.blocking).toBe(true);
    expect(signal?.reason).toBe("HIGH_PHRASE_OVERLAP");
  });

  it("does not flag unrelated items", () => {
    expect(
      findInternalSimilaritySignals(
        {
          id: "candidate",
          prompt:
            "Convert three and one-half liters to milliliters using the metric relationship.",
        },
        [
          {
            id: "existing",
            prompt:
              "Solve the linear inequality and choose every integer that satisfies the result.",
          },
        ],
      ),
    ).toEqual([]);
  });
});
