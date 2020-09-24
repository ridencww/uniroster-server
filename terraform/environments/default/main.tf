variable "aws_region"  { default = "us-east-1" }
variable "environment" { }
variable "prefix"      { }

terraform {
  required_version = ">= 0.12"
}

provider aws {
    region = var.aws_region
}

####### NETWORK #######

variable "vpc_cidr"             { }
variable "azs"                  { }
variable "public_subnets"       { }
variable "private_subnets"      { }
variable "transit_gateway_cidr" { }
variable "transit_gateway_id"   { }

module "network" {
    source = "../../modules/network"

    name                 = "${var.environment}-${var.prefix}"
    vpc_cidr             = var.vpc_cidr
    azs                  = var.azs
    private_subnets      = var.private_subnets
    public_subnets       = var.public_subnets
    transit_gateway_cidr = var.transit_gateway_cidr
    transit_gateway_id   = var.transit_gateway_id
}

####### AURORA #######

variable "ingress_cidr" { }
variable "db_username"  { }
variable "db_password"  { }

module "aurora_rds" {
    source = "../../modules/aurora_rds"

    name         = "${var.environment}-${var.prefix}"
    vpc_id       = module.network.vpc_id
    azs          = var.azs
    ingress_cidr = var.ingress_cidr
    subnet_ids   = module.network.private_subnet_ids
    username     = var.db_username
    password     = var.db_password
}

####### ELASTIC BEANSTALK #######

variable "app_name"          { }
variable "app_port"          { }
variable "app_instance_type" { }
variable "ingress_app_cidr"  { }
variable "ingress_elb_cidr"  { }

module "elastic_beanstalk" {
    source = "../../modules/elastic_beanstalk"

    name              = "${var.environment}-${var.prefix}"
    app_name          = var.app_name
    app_port          = var.app_port
    app_instance_type = var.app_instance_type
    vpc_id            = module.network.vpc_id
    subnet_ids        = module.network.private_subnet_ids
    ingress_app_cidr  = var.ingress_app_cidr
    ingress_elb_cidr  = var.ingress_elb_cidr
    elb_subnet_ids    = module.network.private_subnet_ids
    db_hostname       = module.aurora_rds.endpoint
    db_username       = var.db_username
    db_password       = var.db_password
}