resource "aws_db_subnet_group" "rds-subnet" {
  name        = "${var.environment}-${var.prefix}-${var.engine}-subnet"
  description = "RDS subnet group"
  subnet_ids  = [aws_subnet.main-private-1.id, aws_subnet.main-private-2.id,aws_subnet.main-private-3.id]
}

resource "aws_rds_cluster_instance" "cluster_instances" {
  count              = 1
  identifier         = "${var.environment}-${var.prefix}-${var.identifier}"
  cluster_identifier = aws_rds_cluster.default.id
  instance_class     = var.instance_class
  engine             = aws_rds_cluster.default.engine
  engine_version     = aws_rds_cluster.default.engine_version
}

resource "aws_rds_cluster" "default" {
  cluster_identifier     = "${var.environment}-${var.prefix}-${var.identifier}-cluster"
  availability_zones     = var.availability_zones
  database_name          = var.RDS_DB_NAME
  master_username        = var.RDS_USERNAME
  master_password        = var.RDS_PASSWORD
  engine                 = var.engine
  db_subnet_group_name   = aws_db_subnet_group.rds-subnet.name
}