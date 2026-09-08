output "application_url" {
  description = "Canonical application URL supplied to authentication and billing callbacks."
  value       = var.app_url
}

output "load_balancer_dns_name" {
  description = "Create an external DNS record pointing the approved hostname to this ALB name."
  value       = aws_lb.app.dns_name
}

output "ecs_cluster_name" {
  description = "Cluster containing the application service and one-off migration tasks."
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Application service name."
  value       = aws_ecs_service.app.name
}

output "migration_task_definition_arn" {
  description = "Run this task once before promoting a compatible application task definition."
  value       = aws_ecs_task_definition.migration.arn
}

output "migration_subnet_ids" {
  description = "Private app subnet IDs for the one-off migration task."
  value       = [for subnet in aws_subnet.app : subnet.id]
}

output "migration_security_group_id" {
  description = "Application security group used by the one-off migration task."
  value       = aws_security_group.app.id
}

output "database_endpoint" {
  description = "Private database endpoint; it is reachable only from the application security group."
  value       = aws_db_instance.main.address
}

output "runtime_secret_arn" {
  description = "Secret container used by ECS. Secret values are never output."
  value       = aws_secretsmanager_secret.runtime.arn
}

output "source_artifacts_bucket" {
  description = "Private governed-content artifact bucket."
  value       = aws_s3_bucket.source_artifacts.id
}

output "operations_topic_arn" {
  description = "SNS topic for operational alarms; the email subscription must be confirmed."
  value       = aws_sns_topic.operations.arn
}
