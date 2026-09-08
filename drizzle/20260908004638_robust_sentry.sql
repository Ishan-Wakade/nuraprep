CREATE TYPE "public"."billing_subscription_status" AS ENUM('ACTIVE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'PAST_DUE', 'PAUSED', 'TRIALING', 'UNPAID');--> statement-breakpoint
CREATE TYPE "public"."billing_webhook_outcome" AS ENUM('PROCESSED', 'IGNORED');--> statement-breakpoint
CREATE TABLE "billing_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"stripe_customer_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_customer_stripe_id_check" CHECK ("billing_customers"."stripe_customer_id" LIKE 'cus\_%' ESCAPE '\')
);
--> statement-breakpoint
CREATE TABLE "billing_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billing_customer_id" uuid NOT NULL,
	"stripe_subscription_id" varchar(255) NOT NULL,
	"stripe_product_id" varchar(255) NOT NULL,
	"stripe_price_id" varchar(255),
	"status" "billing_subscription_status" NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"current_period_end" timestamp with time zone,
	"last_stripe_event_created_at" timestamp with time zone NOT NULL,
	"last_stripe_event_id" varchar(255) NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_subscription_stripe_id_check" CHECK ("billing_subscriptions"."stripe_subscription_id" LIKE 'sub\_%' ESCAPE '\'),
	CONSTRAINT "billing_subscription_product_id_check" CHECK ("billing_subscriptions"."stripe_product_id" LIKE 'prod\_%' ESCAPE '\')
);
--> statement-breakpoint
CREATE TABLE "billing_webhook_events" (
	"stripe_event_id" varchar(255) PRIMARY KEY NOT NULL,
	"event_type" varchar(160) NOT NULL,
	"stripe_object_id" varchar(255),
	"livemode" boolean NOT NULL,
	"event_created_at" timestamp with time zone NOT NULL,
	"outcome" "billing_webhook_outcome" NOT NULL,
	"reason_code" varchar(120) NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_webhook_event_id_check" CHECK ("billing_webhook_events"."stripe_event_id" LIKE 'evt\_%' ESCAPE '\')
);
--> statement-breakpoint
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_billing_customer_id_billing_customers_id_fk" FOREIGN KEY ("billing_customer_id") REFERENCES "public"."billing_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_customer_user_idx" ON "billing_customers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_customer_stripe_idx" ON "billing_customers" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_subscription_stripe_idx" ON "billing_subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "billing_subscription_customer_status_idx" ON "billing_subscriptions" USING btree ("billing_customer_id","status");--> statement-breakpoint
CREATE INDEX "billing_webhook_event_type_created_idx" ON "billing_webhook_events" USING btree ("event_type","event_created_at");
--> statement-breakpoint
CREATE FUNCTION reject_billing_webhook_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'billing webhook events are append-only'
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER billing_webhook_event_immutable
BEFORE UPDATE OR DELETE ON billing_webhook_events
FOR EACH ROW EXECUTE FUNCTION reject_billing_webhook_event_mutation();
