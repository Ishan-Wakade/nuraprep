CREATE TABLE "application_rate_limits" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"scope" varchar(80) NOT NULL,
	"count" integer NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_rate_limits_count_check" CHECK ("application_rate_limits"."count" > 0),
	CONSTRAINT "application_rate_limits_window_check" CHECK ("application_rate_limits"."expires_at" > "application_rate_limits"."window_started_at")
);
--> statement-breakpoint
CREATE INDEX "application_rate_limits_expiry_idx" ON "application_rate_limits" USING btree ("expires_at");