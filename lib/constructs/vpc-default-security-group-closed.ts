import {
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_logs as logs,
  CustomResource,
  custom_resources as cr,
  Duration,
  Stack,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as fs from "fs";
import * as path from "path";

interface VpcDefaultSecurityGroupClosedProps {
  vpc: ec2.Vpc;
}

export class VpcDefaultSecurityGroupClosed extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: VpcDefaultSecurityGroupClosedProps
  ) {
    super(scope, id);

    const code = fs
      .readFileSync(
        path.resolve(
          __dirname,
          "../../src/lambda/vpc-default-security-group-closed/index.js"
        )
      )
      .toString();

    const closeFunction = new lambda.Function(this, "Function", {
      code: lambda.Code.fromInline(code),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_14_X,
      initialPolicy: [
        new iam.PolicyStatement({
          actions: [
            "ec2:AuthorizeSecurityGroupIngress",
            "ec2:AuthorizeSecurityGroupEgress",
            "ec2:RevokeSecurityGroupIngress",
            "ec2:RevokeSecurityGroupEgress",
          ],
          resources: [
            `arn:aws:ec2:${Stack.of(this).region}:${
              Stack.of(this).account
            }:security-group/*`,
          ],
          conditions: {
            ArnEquals: {
              "ec2:Vpc": `arn:aws:ec2:${Stack.of(this).region}:${
                Stack.of(this).account
              }:vpc/${props.vpc.vpcId}`,
            },
          },
        }),
        new iam.PolicyStatement({
          actions: ["ec2:DescribeSecurityGroups", "ec2:DescribeVpcs"],
          resources: ["*"],
        }),
      ],
      timeout: Duration.seconds(5),
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    const provider = new cr.Provider(this, "Provider", {
      onEventHandler: closeFunction,
    });

    const closeCustomResource = new CustomResource(this, "CustomResource", {
      serviceToken: provider.serviceToken,
      properties: {
        VpcId: props.vpc.vpcId,
      },
    });

    closeCustomResource.node.addDependency(props.vpc);
  }
}
