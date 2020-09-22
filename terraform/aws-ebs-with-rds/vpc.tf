# Internet VPC
resource "aws_vpc" "main" {
  
  cidr_block           = var.vpc_cidr_block
  instance_tenancy     = "default"
  enable_dns_support   = "true"
  enable_dns_hostnames = "true"
  enable_classiclink   = "false"
  tags = {
    Name = "${var.environment}-${var.prefix}-main-VPC"
  }
}

# Subnets
resource "aws_subnet" "main-public-1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_1_cidr_block
  availability_zone       = var.public_1_zone
  map_public_ip_on_launch = "true"

  tags = {
    Name = "${var.environment}-${var.prefix}-main-public-1"
  }
}

resource "aws_subnet" "main-public-2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_2_cidr_block
  availability_zone       = var.public_2_zone
  map_public_ip_on_launch = "true"

  tags = {
    Name = "${var.environment}-${var.prefix}-main-public-2"
  }
}

resource "aws_subnet" "main-public-3" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_3_cidr_block
  availability_zone       = var.public_3_zone
  map_public_ip_on_launch = "true"

  tags = {
    Name = "${var.environment}-${var.prefix}-main-public-3"
  }
}

resource "aws_subnet" "main-private-1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.private_1_cidr_block
  availability_zone       = var.private_1_zone
  map_public_ip_on_launch = "false"

  tags = {
    Name = "${var.environment}-${var.prefix}-main-private-1"
  }
}

resource "aws_subnet" "main-private-2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.private_2_cidr_block
  availability_zone       = var.private_2_zone
  map_public_ip_on_launch = "false"

  tags = {
    Name = "${var.environment}-${var.prefix}-main-private-2"
  }
}

resource "aws_subnet" "main-private-3" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.private_3_cidr_block
  availability_zone       = var.private_3_zone
  map_public_ip_on_launch = "false"

  tags = {
    Name = "${var.environment}-${var.prefix}-main-private-3"
  }
}

# Internet GW
resource "aws_internet_gateway" "main-gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "main"
  }
}

# route tables
resource "aws_route_table" "main-public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main-gw.id
  }
}

# route associations public
resource "aws_route_table_association" "main-public-1-a" {
  subnet_id      = aws_subnet.main-public-1.id
  route_table_id = aws_route_table.main-public.id
}

resource "aws_route_table_association" "main-public-2-a" {
  subnet_id      = aws_subnet.main-public-2.id
  route_table_id = aws_route_table.main-public.id
}

resource "aws_route_table_association" "main-public-3-a" {
  subnet_id      = aws_subnet.main-public-3.id
  route_table_id = aws_route_table.main-public.id
}

resource "aws_route_table" "main-private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat-gw.id
  }
}

# route associations private
resource "aws_route_table_association" "main-private-1-a" {
  subnet_id      = aws_subnet.main-private-1.id
  route_table_id = aws_route_table.main-private.id
}

resource "aws_route_table_association" "main-private-2-a" {
  subnet_id      = aws_subnet.main-private-2.id
  route_table_id = aws_route_table.main-private.id
}

resource "aws_route_table_association" "main-private-3-a" {
  subnet_id      = aws_subnet.main-private-3.id
  route_table_id = aws_route_table.main-private.id
}

# nat gw
resource "aws_eip" "nat" {
  vpc = true
}

resource "aws_nat_gateway" "nat-gw" {
  
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.main-public-1.id
  depends_on    = [aws_internet_gateway.main-gw]
}

resource "aws_ec2_transit_gateway_vpc_attachment" "transit-gateway" {
  subnet_ids         = [aws_subnet.main-private-1.id, aws_subnet.main-private-2.id, aws_subnet.main-private-3.id]
  transit_gateway_id = var.transit_gateway_id
  vpc_id             = aws_vpc.main.id
}