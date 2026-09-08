data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

locals {
  name               = "${var.project_name}-${var.environment}"
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 2)
  az_map             = { for index, zone in local.availability_zones : tostring(index) => zone }
  nat_gateway_count  = var.single_nat_gateway ? 1 : 2

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Repository  = "Ishan-Wakade/nuraprep"
  }

  runtime_environment = [
    { name = "APP_ENV", value = "production" },
    { name = "NEXT_PUBLIC_APP_URL", value = var.app_url },
    { name = "DEV_LEARNER_ENABLED", value = "false" },
    { name = "DEV_REVIEWER_ENABLED", value = "false" },
    { name = "BILLING_ENABLED", value = tostring(var.billing_enabled) },
    { name = "STRIPE_MODE", value = var.stripe_mode },
    { name = "TRUSTED_PROXY_CIDRS", value = "10.42.0.0/24,10.42.1.0/24" },
    { name = "SOURCE_ARTIFACTS_BUCKET", value = aws_s3_bucket.source_artifacts.id },
  ]

  base_runtime_secrets = [
    { name = "DATABASE_URL", valueFrom = "${aws_secretsmanager_secret.runtime.arn}:DATABASE_URL::" },
    { name = "DIRECT_URL", valueFrom = "${aws_secretsmanager_secret.runtime.arn}:DIRECT_URL::" },
    { name = "BETTER_AUTH_SECRET", valueFrom = "${aws_secretsmanager_secret.runtime.arn}:BETTER_AUTH_SECRET::" },
    { name = "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY", valueFrom = "${aws_secretsmanager_secret.runtime.arn}:NEXT_SERVER_ACTIONS_ENCRYPTION_KEY::" },
    { name = "GOOGLE_CLIENT_ID", valueFrom = "${aws_secretsmanager_secret.runtime.arn}:GOOGLE_CLIENT_ID::" },
    { name = "GOOGLE_CLIENT_SECRET", valueFrom = "${aws_secretsmanager_secret.runtime.arn}:GOOGLE_CLIENT_SECRET::" },
  ]

  stripe_runtime_secrets = var.billing_enabled ? [
    { name = "STRIPE_SECRET_KEY", valueFrom = "${aws_secretsmanager_secret.runtime.arn}:STRIPE_SECRET_KEY::" },
    { name = "STRIPE_WEBHOOK_SECRET", valueFrom = "${aws_secretsmanager_secret.runtime.arn}:STRIPE_WEBHOOK_SECRET::" },
    { name = "STRIPE_PRICE_ID", valueFrom = "${aws_secretsmanager_secret.runtime.arn}:STRIPE_PRICE_ID::" },
    { name = "STRIPE_PREMIUM_PRODUCT_ID", valueFrom = "${aws_secretsmanager_secret.runtime.arn}:STRIPE_PREMIUM_PRODUCT_ID::" },
  ] : []

  runtime_secrets = concat(local.base_runtime_secrets, local.stripe_runtime_secrets)
}

resource "terraform_data" "configuration_guard" {
  lifecycle {
    precondition {
      condition = !var.billing_enabled || (
        var.stripe_secret_key != null &&
        var.stripe_webhook_secret != null &&
        var.stripe_price_id != null &&
        var.stripe_premium_product_id != null
      )
      error_message = "billing_enabled requires all four Stripe values."
    }

    precondition {
      condition     = var.environment != "production" || (var.database_multi_az && var.database_deletion_protection && !var.database_skip_final_snapshot && !var.single_nat_gateway)
      error_message = "Production requires Multi-AZ RDS, deletion protection, a final snapshot, and one NAT gateway per AZ."
    }

    precondition {
      condition     = var.environment != "production" || !var.billing_enabled || var.stripe_mode == "live"
      error_message = "A production environment with billing enabled must use Stripe live mode."
    }

    precondition {
      condition     = var.desired_task_count >= 0 && var.maximum_task_count >= max(var.desired_task_count, 1)
      error_message = "desired_task_count cannot be negative and maximum_task_count must be at least one and no lower than desired count."
    }

    precondition {
      condition     = var.environment != "production" || var.desired_task_count >= 2
      error_message = "Production requires at least two application tasks across the two configured availability zones."
    }
  }
}
