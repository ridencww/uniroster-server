variable cidr               { }
variable vpc_id             { }
variable subnet_ids         { }
variable route_table_id     { }
variable transit_gateway_id { }

resource "aws_route" "tgroute" {
    route_table_id         = var.route_table_id
    destination_cidr_block = var.cidr
    transit_gateway_id     = var.transit_gateway_id
    depends_on             = [aws_ec2_transit_gateway_vpc_attachment.main]
}

resource "aws_ec2_transit_gateway_vpc_attachment" "main" {
  subnet_ids         = split(",", var.subnet_ids)
  transit_gateway_id = var.transit_gateway_id
  vpc_id             = var.vpc_id
}