# TEAS Math source research log

Last desk review: September 5, 2026

This is a bounded discovery log, not a scrape, legal opinion, or claim that every online TEAS resource has been found. Search-engine results identify candidates; they do not establish ownership, accuracy, or permission to reuse content. NuraPrep does not copy source questions, answer choices, values, explanations, or distinctive structures into its database or generation prompts.

The operational source register in `/review/sources` is authoritative for current permissions. Its decisions fail closed and should be rechecked because pages and terms can change.

## Reviewed sources

| Source                                                                                                                            | Access observed                                                | Rights evidence                                                                                                                                             | Decision            | Permitted use                                                                                     | Recheck                               |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------- |
| [ATI TEAS Version 7 content outline](https://www.atitesting.com/docs/default-source/teas-resources/ati_teas7_content_outline.pdf) | Public PDF                                                     | ATI copyright notice in the document                                                                                                                        | `COVERAGE_ANALYSIS` | Human abstraction of high-level objectives only; no quotation, storage, or model input            | Before any taxonomy expansion         |
| [ATI TEAS exam details](https://www.atitesting.com/teas/exam-details)                                                             | Public page                                                    | ATI site terms                                                                                                                                              | `METADATA_ONLY`     | Section-level logistics metadata only                                                             | Before changing an exam specification |
| [ATI TEAS practice-test help](https://help.atitesting.com/teas/teas-prep/teas-practice-test/)                                     | Product/account access is required for practice content        | [ATI website terms](https://www.atitesting.com/TermsOfUse.aspx)                                                                                             | `EXCLUDED`          | None downstream; do not sign in, bypass controls, inspect questions, or retain content            | December 5, 2026                      |
| [Mometrix TEAS Math practice-test landing page](https://www.mometrix.com/academy/teas-math-practice-test/)                        | Public landing page; additional commercial products advertised | [Mometrix terms](https://www.mometrix.com/termsofuse.htm) state that site material is owned or licensed and prohibit reproduction                           | `METADATA_ONLY`     | Publisher, URL, access state, and rights decision only                                            | December 5, 2026                      |
| [Union Test Prep TEAS practice-test landing page](https://uniontestprep.com/teas/practice-test)                                   | Public and premium offerings                                   | [Union Test Prep terms](https://uniontestprep.com/legal/terms) restrict commercial reproduction or exploitation of publisher-posted content without consent | `METADATA_ONLY`     | Publisher, URL, access state, and rights decision only                                            | December 5, 2026                      |
| [TEAS Practice Test Math landing page](https://www.teaspracticetest.com/teas-math/)                                               | Public page                                                    | No clear content-reuse license or terms page established in this review                                                                                     | `QUARANTINED`       | Discovery metadata only; no coverage analysis, body retrieval, storage, quotation, or model input | October 5, 2026                       |

## Unreviewed discovery leads

Search results also surfaced TEAS-focused pages from Effortless Math, Math Notion, Open Exam Prep, TEAS 7 Exam, TEASPlex, Online TEAS Prep, Study Buddy, and video platforms. These names are leads, not approved sources. They must not enter coverage analysis or generation until a reviewer records the canonical publisher, access class, current terms or license, robots/access constraints, and a conservative decision in the source register.

## Review procedure

1. Record only the canonical URL and metadata needed to identify the candidate.
2. Determine whether content is public, openly licensed, gated, paid, or user-submitted without bypassing access controls.
3. Review the publisher's current license and terms. Absence or ambiguity means `QUARANTINED`, not implied permission.
4. Apply the narrowest policy decision. Public visibility alone never enables storage, quotation, model input, or commercial reuse.
5. If `COVERAGE_ANALYSIS` is justified, record only a reviewer-authored abstract note mapped to the internal taxonomy. The note must omit source wording, values, choices, and distinctive item structure.
6. Recheck time-sensitive terms and access conditions on or before the recorded date.
7. Process takedown or rights concerns through `SECURITY.md`; immediately disable downstream use while a concern is investigated.

## Generation boundary

External question text is not a generation input. Generation uses the ATI-aligned internal taxonomy, NuraPrep-authored templates, internally authored question versions, abstract human coverage observations when explicitly permitted, and deterministic validators. Similarity checks are rejection controls, not a license to transform a third-party item.
