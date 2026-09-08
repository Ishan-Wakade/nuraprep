ephemeral "random_password" "database" {
  length  = 32
  special = false
}

resource "aws_db_subnet_group" "main" {
  name       = local.name
  subnet_ids = [for subnet in aws_subnet.database : subnet.id]
  tags       = { Name = local.name }
}

resource "aws_db_parameter_group" "postgres" {
  name_prefix = "${local.name}-"
  family      = "postgres17"
  description = "NuraPrep PostgreSQL TLS and logging baseline"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  lifecycle { create_before_destroy = true }
}

resource "aws_db_instance" "main" {
  identifier = local.name

  engine         = "postgres"
  engine_version = "17"
  instance_class = var.database_instance_class

  db_name  = var.database_name
  username = var.database_username

  password_wo         = ephemeral.random_password.database.result
  password_wo_version = var.secret_version

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false
  multi_az               = var.database_multi_az

  backup_retention_period = var.environment == "production" ? 14 : 3
  backup_window           = "05:00-06:00"
  maintenance_window      = "Sun:06:00-Sun:07:00"

  auto_minor_version_upgrade      = true
  copy_tags_to_snapshot           = true
  deletion_protection             = var.database_deletion_protection
  parameter_group_name            = aws_db_parameter_group.postgres.name
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  skip_final_snapshot       = var.database_skip_final_snapshot
  final_snapshot_identifier = var.database_skip_final_snapshot ? null : "${local.name}-final"
  apply_immediately         = false

  depends_on = [terraform_data.configuration_guard]
}
