DO $$
DECLARE
  current_rule validator_rules%ROWTYPE;
  policy_changed_at timestamptz := now();
BEGIN
  FOR current_rule IN
    SELECT *
    FROM validator_rules
    WHERE active = true
      AND blocks_publication = true
      AND key IN (
        'difficulty-calibration',
        'reading-level',
        'calculator-policy',
        'explanation-consistency',
        'accessibility',
        'topic-alignment',
        'originality'
      )
    ORDER BY key
  LOOP
    UPDATE validator_rules
    SET active = false,
        retired_at = policy_changed_at,
        retired_by = 'owner-mvp-release-policy-2026-09-09'
    WHERE id = current_rule.id;

    INSERT INTO validator_rules (
      key,
      version,
      description,
      blocks_publication,
      active,
      implementation_hash,
      change_notes,
      created_by,
      activated_at
    ) VALUES (
      current_rule.key,
      (SELECT max(version) + 1 FROM validator_rules WHERE key = current_rule.key),
      current_rule.description,
      false,
      true,
      current_rule.implementation_hash,
      'Owner accepted final decisions as the MVP human release gate; this detailed rubric remains available as optional quality evidence.',
      'owner-mvp-release-policy-2026-09-09',
      policy_changed_at
    );
  END LOOP;
END;
$$;
