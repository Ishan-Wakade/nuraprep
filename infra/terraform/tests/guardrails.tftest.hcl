mock_provider "aws" {
  override_during = plan

  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}"
    }
  }

  override_data {
    target = data.aws_availability_zones.available
    values = {
      names = ["us-east-1a", "us-east-1b"]
    }
  }

  override_data {
    target = data.aws_caller_identity.current
    values = {
      account_id = "123456789012"
    }
  }
}

variables {
  environment                        = "staging"
  app_url                            = "https://staging.example.com"
  certificate_arn                    = "arn:aws:acm:us-east-1:123456789012:certificate/test"
  app_image_uri                      = "123456789012.dkr.ecr.us-east-1.amazonaws.com/nuraprep-app@sha256:test"
  migration_image_uri                = "123456789012.dkr.ecr.us-east-1.amazonaws.com/nuraprep-migrate@sha256:test"
  google_client_id                   = "test.apps.googleusercontent.com"
  google_client_secret               = "test-only-secret"
  next_server_actions_encryption_key = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
  alert_email                        = "owner@example.com"
  desired_task_count                 = 0
  maximum_task_count                 = 1
  monthly_budget_usd                 = 100
}

run "staging_bootstrap_is_private_and_recoverable" {
  command = plan

  assert {
    condition     = aws_db_instance.main.publicly_accessible == false
    error_message = "The database must never receive a public endpoint."
  }

  assert {
    condition     = aws_ecs_service.app.network_configuration[0].assign_public_ip == false
    error_message = "Application tasks must remain in private subnets without public IPs."
  }

  assert {
    condition     = aws_s3_bucket.source_artifacts.force_destroy == false
    error_message = "Terraform must not silently delete retained source artifacts."
  }

  assert {
    condition     = aws_secretsmanager_secret.runtime.recovery_window_in_days == 7
    error_message = "Staging secrets need a recovery window instead of immediate deletion."
  }

  assert {
    condition     = aws_budgets_budget.monthly.limit_amount == "100"
    error_message = "The account-wide cost budget must use the owner-approved ceiling."
  }
}

run "production_rejects_staging_availability_settings" {
  command = plan

  variables {
    environment        = "production"
    desired_task_count = 1
  }

  expect_failures = [terraform_data.configuration_guard]
}

run "billing_rejects_incomplete_provider_configuration" {
  command = plan

  variables {
    billing_enabled = true
  }

  expect_failures = [terraform_data.configuration_guard]
}

run "production_accepts_explicit_resilience_settings" {
  command = plan

  variables {
    environment                  = "production"
    database_multi_az            = true
    database_deletion_protection = true
    database_skip_final_snapshot = false
    single_nat_gateway           = false
    desired_task_count           = 2
    maximum_task_count           = 4
  }

  assert {
    condition     = aws_db_instance.main.multi_az && aws_db_instance.main.deletion_protection
    error_message = "Production must retain its RDS resilience controls."
  }

  assert {
    condition     = length(aws_nat_gateway.main) == 2
    error_message = "Production must retain one NAT gateway per configured availability zone."
  }

  assert {
    condition     = aws_ecs_service.app.desired_count == 2
    error_message = "Production must start with at least two application tasks."
  }
}
