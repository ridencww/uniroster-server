resource "aws_security_group" "eb_app" {
  vpc_id      = "${var.vpc_id}"
  name        = "${var.name}-security-group"
  description = "Elastic Beanstalk app security group"

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = var.app_port
    to_port     = var.app_port
    protocol    = "${var.app_port_protocol}"
    cidr_blocks = "${var.ingress_app_cidr}"
  }
}

resource "aws_security_group" "eb_elb" {
  vpc_id      = "${var.vpc_id}"
  name        = "${var.name}-elb-security"
  description = "Elastic Beanstalk load balancer security group"

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = var.app_port
    to_port     = var.app_port
    protocol    = "${var.app_port_protocol}"
    cidr_blocks = "${var.ingress_elb_cidr}"
  }
}