resource "aws_security_group" "app-security" {
  vpc_id      = aws_vpc.main.id
  name        = "${var.environment}-${var.prefix}-security group"
  description = "${var.environment}-${var.prefix}-security group for for the app"

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = var.ingress_app_port
    to_port     = var.ingress_app_port
    protocol    = "tcp"
    cidr_blocks = var.ingress_app_cidr_blocks
  }
}

resource "aws_security_group" "allow-rds" {
  vpc_id      = aws_vpc.main.id
  name        = "${var.environment}-${var.prefix}-allow-rds"
  description = "${var.environment}-${var.prefix}-allow-rds"

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    cidr_blocks     = var.ingress_rds_cidr_blocks
    security_groups = [aws_security_group.app-security.id] # allowing access from our instance
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    self        = true
  }
  
  lifecycle {
    create_before_destroy = true
  }
}