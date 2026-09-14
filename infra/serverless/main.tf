terraform {
  required_version = "~> 1.16.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "nuraprep"
      Environment = "portfolio"
      ManagedBy   = "Terraform"
      CostProfile = "scale-to-zero"
      Repository  = "Ishan-Wakade/nuraprep"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  name                  = "nuraprep-portfolio"
  runtime_parameter_arn = "arn:${data.aws_partition.current.partition}:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${var.runtime_parameter_name}"
}

resource "terraform_data" "guardrails" {
  lifecycle {
    precondition {
      condition     = !var.deployment_enabled || var.app_image_uri != null
      error_message = "deployment_enabled requires a digest-pinned app_image_uri."
    }

    precondition {
      condition     = var.monthly_budget_usd <= 5
      error_message = "The scale-to-zero portfolio stack refuses a monthly budget above $5."
    }
  }
}

resource "aws_ecr_repository" "app" {
  name                 = "${local.name}-app"
  image_tag_mutability = "IMMUTABLE"

  encryption_configuration {
    encryption_type = "AES256"
  }

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Retain only the three newest release images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 3
        }
        action = { type = "expire" }
      }
    ]
  })
}

resource "aws_iam_role" "app" {
  count = var.deployment_enabled ? 1 : 0
  name  = "${local.name}-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "app" {
  count = var.deployment_enabled ? 1 : 0
  name  = "runtime-and-logs"
  role  = aws_iam_role.app[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadOnlyExactRuntimeParameter"
        Effect   = "Allow"
        Action   = ["ssm:GetParameter"]
        Resource = local.runtime_parameter_arn
      },
      {
        Sid      = "WriteOwnLogs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.app[0].arn}:*"
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "app" {
  count             = var.deployment_enabled ? 1 : 0
  name              = "/aws/lambda/${local.name}"
  retention_in_days = 7
}

resource "aws_lambda_function" "app" {
  count         = var.deployment_enabled ? 1 : 0
  function_name = local.name
  package_type  = "Image"
  image_uri     = var.app_image_uri
  role          = aws_iam_role.app[0].arn
  architectures = ["x86_64"]
  memory_size   = 1024
  timeout       = 30

  # New Free plan accounts can have a regional concurrency quota of 10 and
  # AWS requires all 10 executions to remain unreserved. A null value keeps
  # provisioned concurrency disabled and lets that account-wide quota remain
  # the hard ceiling. Operators with a larger quota may opt into a lower,
  # explicit per-function reservation through reserved_concurrency.
  reserved_concurrent_executions = var.reserved_concurrency

  environment {
    variables = {
      NURAPREP_RUNTIME_PARAMETER                   = var.runtime_parameter_name
      AWS_LWA_READINESS_CHECK_PATH                 = "/icon.svg"
      AWS_LWA_READINESS_CHECK_MIN_UNHEALTHY_STATUS = "400"
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.app,
    aws_iam_role_policy.app,
    terraform_data.guardrails,
  ]
}

resource "aws_lambda_function_url" "app" {
  count              = var.deployment_enabled ? 1 : 0
  function_name      = aws_lambda_function.app[0].function_name
  authorization_type = "NONE"
  invoke_mode        = "BUFFERED"
}

resource "aws_cloudwatch_metric_alarm" "errors" {
  count               = var.deployment_enabled ? 1 : 0
  alarm_name          = "${local.name}-errors"
  alarm_description   = "The scale-to-zero NuraPrep Lambda returned an error."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  threshold           = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.app[0].function_name
  }
}

resource "aws_budgets_budget" "monthly" {
  count        = var.alert_email == null ? 0 : 1
  name         = "${local.name}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }
}

output "ecr_repository_url" {
  description = "Push the Lambda application image to this repository."
  value       = aws_ecr_repository.app.repository_url
}

output "application_url" {
  description = "Generated public HTTPS URL; null until deployment_enabled is true."
  value       = try(aws_lambda_function_url.app[0].function_url, null)
}

output "runtime_parameter_name" {
  description = "Create this exact SecureString outside Terraform so no secret enters state."
  value       = var.runtime_parameter_name
}
