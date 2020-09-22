terraform {
  backend "s3"{
      bucket = "cli-oneroster-terraform-artifacts-bucket"
      key  =  "oneroster.core.tfstate"
      region = "us-east-1"
  }
}