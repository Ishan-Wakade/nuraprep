resource "aws_vpc" "main" {
  cidr_block           = "10.42.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = local.name }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = local.name }
}

resource "aws_subnet" "public" {
  for_each = local.az_map

  vpc_id                  = aws_vpc.main.id
  availability_zone       = each.value
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, tonumber(each.key))
  map_public_ip_on_launch = false

  tags = { Name = "${local.name}-public-${each.key}" }
}

resource "aws_subnet" "app" {
  for_each = local.az_map

  vpc_id                  = aws_vpc.main.id
  availability_zone       = each.value
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, 10 + tonumber(each.key))
  map_public_ip_on_launch = false

  tags = { Name = "${local.name}-app-${each.key}" }
}

resource "aws_subnet" "database" {
  for_each = local.az_map

  vpc_id                  = aws_vpc.main.id
  availability_zone       = each.value
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, 20 + tonumber(each.key))
  map_public_ip_on_launch = false

  tags = { Name = "${local.name}-database-${each.key}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${local.name}-public" }
}

resource "aws_route_table_association" "public" {
  for_each = aws_subnet.public

  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

resource "aws_eip" "nat" {
  count = local.nat_gateway_count

  domain = "vpc"
  tags   = { Name = "${local.name}-nat-${count.index}" }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_nat_gateway" "main" {
  count = local.nat_gateway_count

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[tostring(count.index)].id
  tags          = { Name = "${local.name}-${count.index}" }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_route_table" "app" {
  for_each = local.az_map

  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[var.single_nat_gateway ? 0 : tonumber(each.key)].id
  }

  tags = { Name = "${local.name}-app-${each.key}" }
}

resource "aws_route_table_association" "app" {
  for_each = aws_subnet.app

  subnet_id      = each.value.id
  route_table_id = aws_route_table.app[each.key].id
}

resource "aws_route_table" "database" {
  for_each = local.az_map

  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-database-${each.key}" }
}

resource "aws_route_table_association" "database" {
  for_each = aws_subnet.database

  subnet_id      = each.value.id
  route_table_id = aws_route_table.database[each.key].id
}

resource "aws_security_group" "load_balancer" {
  name_prefix = "${local.name}-alb-"
  description = "Public HTTPS entry point"
  vpc_id      = aws_vpc.main.id

  lifecycle { create_before_destroy = true }
}

resource "aws_vpc_security_group_ingress_rule" "load_balancer_http" {
  security_group_id = aws_security_group.load_balancer.id
  description       = "Redirect public HTTP to HTTPS"
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "load_balancer_https" {
  security_group_id = aws_security_group.load_balancer.id
  description       = "Public HTTPS"
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "load_balancer_to_app" {
  security_group_id            = aws_security_group.load_balancer.id
  description                  = "Only forward application traffic to ECS tasks"
  referenced_security_group_id = aws_security_group.app.id
  from_port                    = 3000
  to_port                      = 3000
  ip_protocol                  = "tcp"
}

resource "aws_security_group" "app" {
  name_prefix = "${local.name}-app-"
  description = "Private Fargate application tasks"
  vpc_id      = aws_vpc.main.id

  lifecycle { create_before_destroy = true }
}

resource "aws_vpc_security_group_ingress_rule" "app_from_load_balancer" {
  security_group_id            = aws_security_group.app.id
  description                  = "Application traffic from ALB only"
  referenced_security_group_id = aws_security_group.load_balancer.id
  from_port                    = 3000
  to_port                      = 3000
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "app_outbound" {
  security_group_id = aws_security_group.app.id
  description       = "TLS providers, package APIs, and database replies through controlled routes"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_security_group" "database" {
  name_prefix = "${local.name}-database-"
  description = "Isolated PostgreSQL access from application tasks"
  vpc_id      = aws_vpc.main.id

  lifecycle { create_before_destroy = true }
}

resource "aws_vpc_security_group_ingress_rule" "database_from_app" {
  security_group_id            = aws_security_group.database.id
  description                  = "PostgreSQL from NuraPrep tasks only"
  referenced_security_group_id = aws_security_group.app.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}
