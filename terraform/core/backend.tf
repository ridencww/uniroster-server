terraform {
  backend "s3"{
      bucket = "cli-uniroster-terraform-artifacts-bucket"
      key  =  "uniroster.${var.environment}.tfstate"
      region = "us-east-1"
  }
}