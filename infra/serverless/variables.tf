variable "aws_region" {
  description = "AWS region for the portfolio deployment."
  type        = string
  default     = "us-east-1"
}

variable "deployment_enabled" {
  description = "Creates the public Lambda only after its image is available in ECR."
  type        = bool
  default     = false
}

variable "app_image_uri" {
  description = "Immutable ECR image URI for the lambda-app Docker target."
  type        = string
  default     = null

  validation {
    condition     = var.app_image_uri == null || strcontains(var.app_image_uri, "@sha256:")
    error_message = "app_image_uri must be null or pinned by sha256 digest."
  }
}

variable "runtime_parameter_name" {
  description = "Exact SSM SecureString containing the allowlisted application runtime configuration."
  type        = string
  default     = "/nuraprep/portfolio/runtime"

  validation {
    condition     = can(regex("^/nuraprep/[a-z0-9/_-]+$", var.runtime_parameter_name))
    error_message = "runtime_parameter_name must stay under /nuraprep/."
  }
}

variable "reserved_concurrency" {
  description = "Optional per-function concurrency reservation; leave null when the account quota cannot spare AWS's required 10 unreserved executions."
  type        = number
  default     = null
  nullable    = true

  validation {
    condition     = var.reserved_concurrency == null || (var.reserved_concurrency >= 1 && var.reserved_concurrency <= 5)
    error_message = "reserved_concurrency must be null or between 1 and 5."
  }
}

variable "alert_email" {
  description = "Optional owner email for the account-level cost budget."
  type        = string
  default     = null
  nullable    = true

  validation {
    condition     = var.alert_email == null || can(regex("^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$", var.alert_email))
    error_message = "alert_email must be null or a valid email address."
  }
}

variable "monthly_budget_usd" {
  description = "Notification threshold only; AWS Budgets is not a hard spending cap."
  type        = number
  default     = 1

  validation {
    condition     = var.monthly_budget_usd >= 1 && var.monthly_budget_usd <= 5
    error_message = "monthly_budget_usd must be between 1 and 5."
  }
}
