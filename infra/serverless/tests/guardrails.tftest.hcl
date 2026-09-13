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
    condition     = aws_lambda_function.app[0].reserved_concurrent_executions == 2
    error_message = "Portfolio concurrency must remain explicitly cost-gated."
  }

  assert {
    condition     = aws_lambda_function_url.app[0].authorization_type == "NONE"
    error_message = "The portfolio endpoint must be intentionally public."
  }

  assert {
    condition     = aws_lambda_function.app[0].environment[0].variables.NURAPREP_RUNTIME_PARAMETER == "/nuraprep/portfolio/runtime"
    error_message = "The application must receive only the configured runtime parameter name."
  }
}
