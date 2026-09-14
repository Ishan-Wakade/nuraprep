mock_provider "aws" {}

run "bootstrap_creates_only_repository" {
  command = plan

  assert {
    condition     = length(aws_lambda_function.app) == 0
    error_message = "The bootstrap plan must not create a Lambda before an image is supplied."
  }

  assert {
    condition     = aws_ecr_repository.app.image_tag_mutability == "IMMUTABLE"
    error_message = "Release image tags must be immutable."
  }
}

run "public_runtime_is_bounded" {
  command = plan

  variables {
    deployment_enabled = true
    app_image_uri      = "123456789012.dkr.ecr.us-east-1.amazonaws.com/nuraprep-portfolio-app@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  }

  assert {
    condition     = aws_lambda_function.app[0].reserved_concurrent_executions == null
    error_message = "The Free plan deployment must not request reserved or provisioned concurrency."
  }

  assert {
    condition     = var.reserved_concurrency == null
    error_message = "The default must preserve the new-account regional concurrency ceiling."
  }

  assert {
    condition     = aws_lambda_function_url.app[0].authorization_type == "NONE"
    error_message = "The portfolio endpoint must be intentionally public."
  }

  assert {
    condition     = aws_lambda_function.app[0].environment[0].variables.NURAPREP_RUNTIME_PARAMETER == "/nuraprep/portfolio/runtime"
    error_message = "The application must receive only the configured runtime parameter name."
  }

  assert {
    condition     = aws_lambda_function.app[0].environment[0].variables.AWS_LWA_READINESS_CHECK_PATH == "/icon.svg"
    error_message = "Lambda startup readiness must not depend on a sleeping database."
  }
}
