resource "aws_s3_bucket" "source_artifacts" {
  bucket        = "${data.aws_caller_identity.current.account_id}-${local.name}-source-artifacts"
  force_destroy = false

  tags = { DataClass = "GovernedContent" }
}

resource "aws_s3_bucket_public_access_block" "source_artifacts" {
  bucket = aws_s3_bucket.source_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "source_artifacts" {
  bucket = aws_s3_bucket.source_artifacts.id

  rule { object_ownership = "BucketOwnerEnforced" }
}

resource "aws_s3_bucket_versioning" "source_artifacts" {
  bucket = aws_s3_bucket.source_artifacts.id

  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "source_artifacts" {
  bucket = aws_s3_bucket.source_artifacts.id

  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "source_artifacts" {
  bucket = aws_s3_bucket.source_artifacts.id

  rule {
    id     = "expire-incomplete-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload { days_after_initiation = 7 }

    noncurrent_version_expiration {
      noncurrent_days = var.environment == "production" ? 365 : 90
    }
  }

  depends_on = [aws_s3_bucket_versioning.source_artifacts]
}

resource "aws_s3_bucket_policy" "source_artifacts" {
  bucket = aws_s3_bucket.source_artifacts.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource = [
        aws_s3_bucket.source_artifacts.arn,
        "${aws_s3_bucket.source_artifacts.arn}/*",
      ]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })
}
