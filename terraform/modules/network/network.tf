variable "name"                 { }
variable "vpc_cidr"             { }
variable "azs"                  { }
variable "private_subnets"      { }
variable "public_subnets"       { }
variable "transit_gateway_cidr" { }
variable "transit_gateway_id"   { }

module "vpc" {
  source = "./vpc"

  name = "${var.name}-vpc"
  cidr = var.vpc_cidr
}

module "public_subnet" {
  source = "./public_subnet"

  name   = "${var.name}-public"
  vpc_id = module.vpc.vpc_id
  cidrs  = var.public_subnets
  azs    = var.azs
}

module "nat" {
  source = "./nat"

  name             = "${var.name}-nat"
  azs              = var.azs
  public_subnet_id = element(split(",", module.public_subnet.subnet_ids), 0)
}

module "private_subnet" {
  source = "./private_subnet"

  name   = "${var.name}-private"
  vpc_id = module.vpc.vpc_id
  cidrs  = var.private_subnets
  azs    = var.azs

  nat_gateway_id = module.nat.nat_gateway_id
}

module "transit_gateway" {
    source = "./transit_gateway"

    cidr               = var.transit_gateway_cidr
    vpc_id             = module.vpc.vpc_id
    subnet_ids         = module.private_subnet.subnet_ids
    route_table_id     = module.private_subnet.route_table_id
    transit_gateway_id = var.transit_gateway_id
}

output "vpc_id"   { value = module.vpc.vpc_id }

output "public_subnet_ids"  { value = module.public_subnet.subnet_ids }
output "private_subnet_ids" { value = module.private_subnet.subnet_ids }