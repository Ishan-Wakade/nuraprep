ephemeral "random_password" "better_auth" {
  length  = 64
  special = false
}

locals {
  database_url = "postgresql://${var.database_username}:${urlencode(ephemeral.random_password.database.result)}@${aws_db_instance.main.address}:5432/${var.database_name}?sslmode=require"
  runtime_secret_payload = jsonencode(merge(
    {
      DATABASE_URL                       = local.database_url
      DIRECT_URL                         = local.database_url
      BETTER_AUTH_SECRET                 = ephemeral.random_password.better_auth.result
      NEXT_SERVER_ACTIONS_ENCRYPTION_KEY = var.next_server_actions_encryption_key
      GOOGLE_CLIENT_ID                   = var.google_client_id
      GOOGLE_CLIENT_SECRET               = var.google_client_secret
    },
    var.billing_enabled ? {
      STRIPE_SECRET_KEY         = var.stripe_secret_key
      STRIPE_WEBHOOK_SECRET     = var.stripe_webhook_secret
      STRIPE_PRICE_ID           = var.stripe_price_id
      STRIPE_PREMIUM_PRODUCT_ID = var.stripe_premium_product_id
    } : {}
  ))
}

resource "aws_secretsmanager_secret" "runtime" {
  name                    = "${local.name}/runtime"
  description             = "NuraPrep runtime configuration; values are injected only into ECS tasks"
  recovery_window_in_days = var.environment == "production" ? 30 : 7
}

resource "aws_secretsmanager_secret_version" "runtime" {
  secret_id                = aws_secretsmanager_secret.runtime.id
  secret_string_wo         = local.runtime_secret_payload
  secret_string_wo_version = var.secret_version
}
