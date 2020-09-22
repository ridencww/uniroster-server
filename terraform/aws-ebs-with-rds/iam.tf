resource "aws_iam_instance_profile" "app-ec2-role" {
  name = "uniroster-instance-profile"
  role = aws_iam_role.app-ec2-role.name
}

resource "aws_iam_role" "app-ec2-role" {
  name                  = "${var.environment}-${var.prefix}-app-ec2-role"
  force_detach_policies = true
  assume_role_policy    = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_role" "elasticbeanstalk-service-role" {
  name                  = "${var.environment}-${var.prefix}-elasticbeanstalk-service-role"
  force_detach_policies = true
  assume_role_policy    = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "elasticbeanstalk.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF

}

resource "aws_iam_role_policy" "app-attach1" {
  role   = aws_iam_role.app-ec2-role.name
  policy = <<POLICY
{
   "Version":"2012-10-17",
   "Statement":[
      {
         "Sid":"BucketAccess",
         "Action":[
            "s3:Get*",
            "s3:List*",
            "s3:PutObject"
         ],
         "Effect":"Allow",
         "Resource":[
            "arn:aws:s3:::elasticbeanstalk-*",
            "arn:aws:s3:::elasticbeanstalk-*/*"
         ]
      },
      {
         "Sid":"CloudWatchLogsAccess",
         "Action":[
            "logs:PutLogEvents",
            "logs:CreateLogStream",
            "logs:DescribeLogStreams",
            "logs:DescribeLogGroups"
         ],
         "Effect":"Allow",
         "Resource":[
            "arn:aws:logs:*:*:log-group:/aws/elasticbeanstalk*"
         ]
      },
      {
         "Sid":"ECSAccess",
         "Effect":"Allow",
         "Action":[
            "ecs:Poll",
            "ecs:StartTask",
            "ecs:StopTask",
            "ecs:DiscoverPollEndpoint",
            "ecs:StartTelemetrySession",
            "ecs:RegisterContainerInstance",
            "ecs:DeregisterContainerInstance",
            "ecs:DescribeContainerInstances",
            "ecs:Submit*",
            "ecs:DescribeTasks"
         ],
         "Resource":"*"
      },
      {
         "Sid":"MetricsAccess",
         "Action":[
            "cloudwatch:PutMetricData"
         ],
         "Effect":"Allow",
         "Resource":"*"
      },
      {
         "Sid":"QueueAccess",
         "Action":[
            "sqs:ChangeMessageVisibility",
            "sqs:DeleteMessage",
            "sqs:ReceiveMessage",
            "sqs:SendMessage"
         ],
         "Effect":"Allow",
         "Resource":"*"
      },   
      {
         "Effect":"Allow",
         "Action":[
            "ecr:GetAuthorizationToken",
            "ecr:BatchCheckLayerAvailability",
            "ecr:GetDownloadUrlForLayer",
            "ecr:GetRepositoryPolicy",
            "ecr:DescribeRepositories",
            "ecr:ListImages",
            "ecr:DescribeImages",
            "ecr:BatchGetImage",
            "ecr:GetLifecyclePolicy",
            "ecr:GetLifecyclePolicyPreview",
            "ecr:ListTagsForResource",
            "ecr:DescribeImageScanFindings"
         ],
         "Resource":"*"
      },
      {
         "Effect":"Allow",
         "Action":"s3:*",
         "Resource":"*"
      },
      {
         "Effect":"Allow",
         "Action":"states:*",
         "Resource":"*"
      }
   ]
}
  POLICY
}

resource "aws_iam_role_policy" "app-attach5" {
  role = aws_iam_role.elasticbeanstalk-service-role.name
  policy = <<POLICY
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:GetRepositoryPolicy",
                "ecr:DescribeRepositories",
                "ecr:ListImages",
                "ecr:DescribeImages",
                "ecr:BatchGetImage",
                "ecr:GetLifecyclePolicy",
                "ecr:GetLifecyclePolicyPreview",
                "ecr:ListTagsForResource",
                "ecr:DescribeImageScanFindings"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:DescribeInstanceHealth",
                "elasticloadbalancing:DescribeLoadBalancers",
                "elasticloadbalancing:DescribeTargetHealth",
                "ec2:DescribeInstances",
                "ec2:DescribeInstanceStatus",
                "ec2:GetConsoleOutput",
                "ec2:AssociateAddress",
                "ec2:DescribeAddresses",
                "ec2:DescribeSecurityGroups",
                "sqs:GetQueueAttributes",
                "sqs:GetQueueUrl",
                "autoscaling:DescribeAutoScalingGroups",
                "autoscaling:DescribeAutoScalingInstances",
                "autoscaling:DescribeScalingActivities",
                "autoscaling:DescribeNotificationConfigurations",
                "sns:Publish"
            ],
            "Resource": [
                "*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:DescribeLogStreams",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:log-group:/aws/elasticbeanstalk/*:log-stream:*"
        },
        {
            "Effect": "Allow",
            "Action": "states:*",
            "Resource": "*"
        }
    ]
  }
  POLICY
}
