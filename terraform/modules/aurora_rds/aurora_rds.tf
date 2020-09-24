variable "name"            { default = "aurora" }
variable "engine"          { default = "aurora-mysql" }
variable "engine_version"  { default = "5.7.mysql_aurora.2.03.2" }
variable "instance_class"  { default = "db.t2.small" }
variable "instance_count"  { default = 1 }
variable "port"            { default = 3306 }
variable "azs"             { }
variable "vpc_id"          { }
variable "ingress_cidr"    { }
variable "subnet_ids"      { }
variable "username"        { }
variable "password"        { }

resource "aws_security_group" "allow-rds" {
  vpc_id      = var.vpc_id
  name        = "${var.name}-allow-rds"
  description = "Security group to allow access to the port the database is running on"

  ingress {
    from_port       = var.port
    to_port         = var.port
    protocol        = "tcp"
    cidr_blocks     = var.ingress_cidr
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

resource "aws_db_subnet_group" "aurora" {
  name        = "${var.name}-subnet"
  subnet_ids  = split(",", var.subnet_ids)
}

resource "aws_rds_cluster_instance" "cluster_instances" {
  count              = var.instance_count
  identifier         = var.name
  cluster_identifier = aws_rds_cluster.cluster.id
  instance_class     = var.instance_class
  engine             = aws_rds_cluster.cluster.engine
  engine_version     = aws_rds_cluster.cluster.engine_version
}

resource "aws_rds_cluster" "cluster" {
  cluster_identifier     = "${var.name}-cluster"
  availability_zones     = split(",", var.azs)
  master_username        = var.username
  master_password        = var.password
  engine                 = var.engine
  engine_version         = var.engine_version
  db_subnet_group_name   = aws_db_subnet_group.aurora.name
  vpc_security_group_ids = [aws_security_group.allow-rds.id]
}

output "endpoint" { value = aws_rds_cluster.cluster.endpoint }