output "ebs-cname" {
  value = aws_elastic_beanstalk_environment.uniroster-app.cname
}

output "ebs-env" {
  value = aws_elastic_beanstalk_environment.uniroster-app.name
}

output "application" {
  value = aws_elastic_beanstalk_environment.uniroster-app.application
}
