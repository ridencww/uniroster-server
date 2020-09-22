variable "ebs_app_name"{}
variable "build_artifact_bucket"{}

# General variables
variable "aws_region"{}
variable "environment"{}
variable "prefix"{}
variable "app_version"{}

# RDS related details
variable "rds_family"{}
variable "allocated_storage"{}
variable "engine"{}
variable "identifier"{}
variable "instance_class"{}
variable "multi_az"{}

# EBS instance details
variable "app_instance_type"{}
variable "autoscaling_min_size"{}
variable "autoscaling_max_size"{}
variable "solution_stack_name"{}

variable "RDS_USERNAME"{}
variable "RDS_PASSWORD"{}
variable "RDS_DB_NAME"{}

variable "transit_gateway_id"{}

variable "vpc_cidr_block"{}
variable "public_1_cidr_block"{}
variable "public_1_zone"{}
variable "public_2_cidr_block"{}
variable "public_2_zone"{}
variable "public_3_cidr_block"{}
variable "public_3_zone"{}
variable "private_1_cidr_block"{}
variable "private_1_zone"{}
variable "private_2_cidr_block"{}
variable "private_2_zone"{}
variable "private_3_cidr_block"{}
variable "private_3_zone"{}