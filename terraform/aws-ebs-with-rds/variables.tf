variable "environment" {}
variable "prefix" {}

variable "rds_family" {}
variable "allocated_storage" {}
variable "engine" {}
variable "instance_class" {}
variable "identifier" {}
variable "multi_az" {}
variable "availability_zones" {}

variable "RDS_USERNAME" {}
variable "RDS_PASSWORD" {}

variable "app_instance_type" {}
variable "ebs_app_name"{}
variable "autoscaling_min_size" {}
variable "autoscaling_max_size" {}
variable "solution_stack_name" {}

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

variable "transit_gateway_route_cidr_block"{}
variable "ingress_rds_cidr_blocks"{}
variable "ingress_app_cidr_blocks"{}
variable "ingress_app_port"{}