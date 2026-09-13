data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "maintenance_worker" {
  name               = "${local.name}-maintenance-worker"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "maintenance_worker_vpc" {
  role       = aws_iam_role.maintenance_worker.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

data "aws_iam_policy_document" "maintenance_worker_secret" {
  statement {
    sid       = "ReadOnlyNuraPrepRuntimeSecret"
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.runtime.arn]
  }
}

resource "aws_iam_role_policy" "maintenance_worker_secret" {
  name   = "read-runtime-secret"
  role   = aws_iam_role.maintenance_worker.id
  policy = data.aws_iam_policy_document.maintenance_worker_secret.json
}

resource "aws_cloudwatch_log_group" "maintenance_worker" {
  name              = "/aws/lambda/${local.name}-generation-maintenance"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "generation_maintenance" {
  function_name = "${local.name}-generation-maintenance"
  description   = "Bounded recovery and observability for expired question-generation leases"
  role          = aws_iam_role.maintenance_worker.arn
  package_type  = "Image"
  image_uri     = var.maintenance_worker_image_uri
  architectures = ["x86_64"]
  memory_size   = 256
  timeout       = 30

  reserved_concurrent_executions = 1

  image_config {
    command = ["index.handler"]
  }

  environment {
    variables = {
      RUNTIME_SECRET_ARN = aws_secretsmanager_secret.runtime.arn
    }
  }

  vpc_config {
    security_group_ids = [aws_security_group.maintenance_worker.id]
    subnet_ids         = [for subnet in aws_subnet.app : subnet.id]
  }

  depends_on = [
    aws_cloudwatch_log_group.maintenance_worker,
    aws_iam_role_policy.maintenance_worker_secret,
    aws_iam_role_policy_attachment.maintenance_worker_vpc,
    aws_secretsmanager_secret_version.runtime,
  ]
}

resource "aws_cloudwatch_event_rule" "generation_maintenance" {
  name                = "${local.name}-generation-maintenance"
  description         = "Run bounded generation-queue lease maintenance"
  schedule_expression = var.generation_maintenance_schedule
}

resource "aws_cloudwatch_event_target" "generation_maintenance" {
  rule = aws_cloudwatch_event_rule.generation_maintenance.name
  arn  = aws_lambda_function.generation_maintenance.arn
}

resource "aws_lambda_permission" "generation_maintenance_schedule" {
  statement_id  = "AllowEventBridgeSchedule"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.generation_maintenance.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.generation_maintenance.arn
}

resource "aws_cloudwatch_metric_alarm" "maintenance_worker_errors" {
  alarm_name          = "${local.name}-maintenance-worker-errors"
  alarm_description   = "The scheduled generation maintenance Lambda reported an error."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  threshold           = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.operations.arn]

  dimensions = {
    FunctionName = aws_lambda_function.generation_maintenance.function_name
  }
}
