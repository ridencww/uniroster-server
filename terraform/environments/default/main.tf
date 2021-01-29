variable "aws_region"  { default = "us-east-1" }
variable "prefix"      { default = "uniroster" }
variable "environment" { }

terraform {
  required_version = ">= 0.12"
}

provider aws {
    region = var.aws_region
}

####### NETWORK #######

# If aws_region is set via tfvars to something other than us-east-1 this will need
# to be set to matching availability zones
variable "azs"                  { default = "us-east-1a,us-east-1b,us-east-1c" } 

variable "vpc_cidr"             { }
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

variable "db_username"  { default = "uniroster" }
variable "db_password"  { }
variable "ingress_cidr" { }

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

variable "app_name"               { default = "uniroster-app" }  # Keep this default in sync with the default in terraform/core/core.tf
variable "app_port"               { default = 80 }
variable "app_instance_type"      { default = "t2.micro" }
variable "new_relic_license_key"  { }
variable "ingress_app_cidr"       { }
variable "ingress_elb_cidr"       { }
variable "ssl_certificate_id"     { }

module "elastic_beanstalk" {
    source = "../../modules/elastic_beanstalk"

    name                  = "${var.environment}-${var.prefix}"
    app_name              = var.app_name
    app_port              = var.app_port
    app_instance_type     = var.app_instance_type
    vpc_id                = module.network.vpc_id
    subnet_ids            = module.network.private_subnet_ids
    ingress_app_cidr      = var.ingress_app_cidr
    ingress_elb_cidr      = var.ingress_elb_cidr
    elb_subnet_ids        = module.network.public_subnet_ids
    db_hostname           = module.aurora_rds.endpoint
    db_username           = var.db_username
    db_password           = var.db_password
    ssl_certificate_id    = var.ssl_certificate_id
    new_relic_app_name    = "${var.prefix}-${var.environment}"
    new_relic_license_key = var.new_relic_license_key
}