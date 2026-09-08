variable "project_name" {
  description = "Short lowercase project identifier used in resource names."
  type        = string
  default     = "nuraprep"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,20}$", var.project_name))
    error_message = "project_name must be 3-21 lowercase letters, digits, or hyphens."
  }
}

variable "environment" {
  description = "Isolated deployment environment."
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "aws_region" {
  description = "AWS region selected after latency, service availability, and price review."
  type        = string
  default     = "us-east-1"
}

variable "app_url" {
  description = "Exact public HTTPS origin used by Next.js, OAuth, and Stripe callbacks."
  type        = string

  validation {
    condition     = can(regex("^https://", var.app_url))
    error_message = "app_url must be an HTTPS origin."
  }
}

variable "certificate_arn" {
  description = "Validated ACM certificate for the app hostname. DNS is intentionally managed outside this stack."
  type        = string

  validation {
    condition     = can(regex("^arn:aws[a-z-]*:acm:", var.certificate_arn))
    error_message = "certificate_arn must be an ACM certificate ARN."
  }
}

variable "app_image_uri" {
  description = "Immutable ECR image URI, including a digest, for the Next.js runner stage."
  type        = string

  validation {
    condition     = strcontains(var.app_image_uri, "@sha256:")
    error_message = "app_image_uri must be pinned by sha256 digest."
  }
}

variable "migration_image_uri" {
  description = "Immutable ECR image URI, including a digest, for the Docker builder/migration stage."
  type        = string

  validation {
    condition     = strcontains(var.migration_image_uri, "@sha256:")
    error_message = "migration_image_uri must be pinned by sha256 digest."
  }
}

variable "google_client_id" {
  description = "Environment-specific Google OAuth client ID."
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Environment-specific Google OAuth client secret."
  type        = string
  sensitive   = true
}

variable "billing_enabled" {
  description = "Explicitly enables Stripe integration for this environment."
  type        = bool
  default     = false
}

variable "stripe_mode" {
  description = "Stripe object mode expected by the webhook."
  type        = string
  default     = "test"

  validation {
    condition     = contains(["test", "live"], var.stripe_mode)
    error_message = "stripe_mode must be test or live."
  }
}

variable "stripe_secret_key" {
  description = "Stripe server key; required only when billing_enabled is true."
  type        = string
  sensitive   = true
  default     = null
}

variable "stripe_webhook_secret" {
  description = "Stripe endpoint signing secret; required only when billing_enabled is true."
  type        = string
  sensitive   = true
  default     = null
}

variable "stripe_price_id" {
  description = "Server-owned recurring Stripe Price ID."
  type        = string
  default     = null
}

variable "stripe_premium_product_id" {
  description = "Stripe Product ID that grants Premium Math access."
  type        = string
  default     = null
}

variable "secret_version" {
  description = "Increment to rotate generated database/auth values and publish a new runtime secret version."
  type        = number
  default     = 1

  validation {
    condition     = var.secret_version >= 1 && floor(var.secret_version) == var.secret_version
    error_message = "secret_version must be a positive integer."
  }
}

variable "database_name" {
  description = "PostgreSQL database name."
  type        = string
  default     = "nuraprep"
}

variable "database_username" {
  description = "Initial PostgreSQL owner used by app and migration tasks in this first deployment design."
  type        = string
  default     = "nuraprep_owner"
}

variable "database_instance_class" {
  description = "RDS instance class selected during cost review."
  type        = string
  default     = "db.t4g.micro"
}

variable "database_multi_az" {
  description = "Use an RDS standby in another AZ. Required by the production guard."
  type        = bool
  default     = false
}

variable "database_deletion_protection" {
  description = "Prevent accidental database deletion. Required by the production guard."
  type        = bool
  default     = false
}

variable "database_skip_final_snapshot" {
  description = "Allow teardown without a final snapshot. Must be false in production."
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use one NAT gateway to reduce staging cost. Production requires one per AZ."
  type        = bool
  default     = true
}

variable "desired_task_count" {
  description = "Steady-state application tasks. Use zero only for the first staging migration bootstrap."
  type        = number
  default     = 1
}

variable "maximum_task_count" {
  description = "Maximum application tasks under target tracking."
  type        = number
  default     = 2
}

variable "log_retention_days" {
  description = "CloudWatch application log retention."
  type        = number
  default     = 30
}

variable "monthly_budget_usd" {
  description = "Account-wide monthly cost alert target; this does not cap spend automatically."
  type        = number
  default     = 150

  validation {
    condition     = var.monthly_budget_usd > 0
    error_message = "monthly_budget_usd must be positive."
  }
}

variable "alert_email" {
  description = "Owner email for AWS Budget and operational alarm notifications."
  type        = string

  validation {
    condition     = can(regex("^[^@]+@[^@]+\\.[^@]+$", var.alert_email))
    error_message = "alert_email must be a valid email address."
  }
}
