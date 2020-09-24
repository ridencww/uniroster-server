terraform {
  required_version = ">= 0.12"
}

provider aws {
    region = var.aws_region
}

resource "aws_s3_bucket" "build_bucket" {
  bucket = var.build_artifact_bucket
  acl    = "private"
}

resource "aws_elastic_beanstalk_application" "uniroster-app" {
  name        = "${var.app_name}"
  description = "Beanstalk application"
}