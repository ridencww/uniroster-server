variable "aws_region"            { default = "us-east-1" }
variable "app_name"              { default = "uniroster-app" }

terraform {
  required_version = ">= 0.12"
}

provider aws {
    region = var.aws_region
}

resource "aws_elastic_beanstalk_application" "uniroster-app" {
  name        = var.app_name
  description = "Beanstalk application"
}