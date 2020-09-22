output "ebs-cname" {
  value = aws_elastic_beanstalk_environment.oneroster-app.cname
}

output "ebs-env" {
  value = aws_elastic_beanstalk_environment.oneroster-app.name
}

output "application" {
  value = aws_elastic_beanstalk_environment.oneroster-app.application
}
