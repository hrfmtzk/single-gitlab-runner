import {
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_logs as logs,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { VpcDefaultSecurityGroupClosed } from "./constructs/vpc-default-security-group-closed";

interface SingleGitlabRunnerStackProps extends StackProps {
  enableVpcFlowLog?: boolean;
  deleteDefaultSecurityGroup?: boolean;
}

export class SingleGitlabRunnerStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props?: SingleGitlabRunnerStackProps
  ) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "Vpc", {
      cidr: "10.0.0.0/16",
      maxAzs: 1,
      subnetConfiguration: [
        {
          subnetType: ec2.SubnetType.PUBLIC,
          name: "Public",
          cidrMask: 24,
        },
      ],
    });
    if (props?.enableVpcFlowLog) {
      vpc.addFlowLog("FlowLog", {
        destination: ec2.FlowLogDestination.toCloudWatchLogs(
          new logs.LogGroup(this, "LogGroup", {
            retention: logs.RetentionDays.ONE_MONTH,
          })
        ),
      });
    }
    if (props?.deleteDefaultSecurityGroup) {
      new VpcDefaultSecurityGroupClosed(this, "DefaultSecurityGroupClose", {
        vpc,
      });
    }

    const securityGroup = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc: vpc,
    });

    const role = new iam.Role(this, "Role", {
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
      ],
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
    });

    const instance = new ec2.Instance(this, "Instance", {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MEDIUM
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      vpc: vpc,
      securityGroup: securityGroup,
      role: role,
      init: ec2.CloudFormationInit.fromConfigSets({
        configSets: {
          default: ["installRequirements", "installRunner"],
        },
        configs: {
          installRequirements: new ec2.InitConfig([
            ec2.InitPackage.yum("docker"),
            ec2.InitCommand.shellCommand(
              "systemctl enable --now docker.service"
            ),
            ec2.InitCommand.shellCommand(
              "curl -L 'https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.rpm.sh' | sudo bash"
            ),
          ]),
          installRunner: new ec2.InitConfig([
            ec2.InitPackage.yum("gitlab-runner"),
            ec2.InitCommand.shellCommand(
              "systemctl enable --now gitlab-runner.service"
            ),
          ]),
        },
      }),
    });
  }
}
