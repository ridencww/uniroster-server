variable "name"             { default = "nat" }
variable "azs"              { }
variable "public_subnet_id" { }

resource "aws_eip" "nat" {
  vpc   = true

  lifecycle { create_before_destroy = true }
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = var.public_subnet_id

  lifecycle { create_before_destroy = true }
}

output "nat_gateway_id" { value = aws_nat_gateway.nat.id }