# NuraPrep AWS infrastructure

This Terraform root describes the reviewed target shape for NuraPrep; it does not prove that an AWS environment exists. It creates an HTTPS Application Load Balancer, private ECS Fargate tasks, isolated RDS PostgreSQL, private versioned S3 storage, Secrets Manager configuration, CloudWatch logs and alarms, and an AWS cost budget.

The stack deliberately excludes the domain, ACM validation, ECR repositories, container builds, and Terraform state bucket. Those are prerequisites because they have distinct ownership and lifecycle concerns, and the service cannot be planned safely until immutable image digests and an approved hostname exist.

## Safe validation (no AWS resources)

```bash
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
terraform test
```

Validation and the mocked guardrail tests do not create infrastructure or require AWS credentials. Do not run `terraform apply` until the approval checklist in [`docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md) is complete. The checked-in example values are placeholders, not deployable credentials.

## Security and cost boundaries

- Application and database tasks have no public IPs; only the load balancer is internet-facing.
- The database is not publicly reachable, requires TLS, encrypts storage, and exports PostgreSQL logs.
- ECS receives runtime values from one Secrets Manager document. Terraform 1.16 write-only fields keep generated database and auth values out of plans and state.
- Image variables require digest-pinned ECR URIs.
- Production configuration fails validation unless RDS is Multi-AZ and deletion-protected, final snapshots are enabled, each app subnet has independent NAT egress, and at least two app tasks are requested.
- Staging can use one NAT gateway and one database instance to reduce recurring cost.
- The budget intentionally watches the entire deployment account so untagged costs cannot evade it. AWS Budgets sends alerts; it is not a hard spending cap and billing data can lag.
- The first deployment still uses the database owner for app and migration tasks. Splitting runtime and migration database roles is a documented production-hardening item.

Read the full build, migration, plan, rollback, and cost-review procedure in [`docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md).
