CREATE TABLE "auth_rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "auth_rate_limits_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION audit_auth_session_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id text;
  v_event_type varchar(80);
BEGIN
  IF current_setting('nuraprep.account_erasure', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_user_id := NEW.user_id;
    v_event_type := 'SESSION_CREATED';
  ELSE
    v_user_id := OLD.user_id;
    v_event_type := 'SESSION_REVOKED';
  END IF;

  INSERT INTO account_audit_events (user_id, event_type, actor_id, metadata)
  VALUES (v_user_id, v_event_type, v_user_id, '{}'::jsonb);

  RETURN COALESCE(NEW, OLD);
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_auth_session_lifecycle
AFTER INSERT OR DELETE ON auth_sessions
FOR EACH ROW EXECUTE FUNCTION audit_auth_session_lifecycle();
