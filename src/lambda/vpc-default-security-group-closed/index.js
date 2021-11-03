const response = require("cfn-response");
const AWS = require("aws-sdk");
const ec2 = new AWS.EC2();

exports.handler = async (event, context) => {
  if (event.RequestType !== "Create") {
    return;
  }

  try {
    const result = await ec2
      .describeSecurityGroups({
        Filters: [
          {
            Name: "vpc-id",
            Values: [event.ResourceProperties.VpcId],
          },
        ],
      })
      .promise();

    const securityGroups = result.SecurityGroups.filter((securityGroup) => {
      return securityGroup.GroupName === "default";
    });

    if (securityGroups.length === 0) {
      return;
    }

    const groupId = securityGroups[0].GroupId;
    const egressIpPermission = securityGroups[0].IpPermissionsEgress[0];
    const ingressIpPermission = securityGroups[0].IpPermissions[0];
    const egressResult = await ec2
      .revokeSecurityGroupEgress({
        GroupId: groupId,
        IpPermissions: [
          {
            IpProtocol: egressIpPermission.IpProtocol,
            IpRanges: egressIpPermission.IpRanges,
          },
        ],
      })
      .promise();
    const ingressResult = await ec2
      .revokeSecurityGroupIngress({
        GroupId: groupId,
        IpPermissions: [
          {
            IpProtocol: ingressIpPermission.IpProtocol,
            UserIdGroupPairs: ingressIpPermission.UserIdGroupPairs,
          },
        ],
      })
      .promise();

    const responseData = { egressResult, ingressResult };
    console.debug(responseData);
    response.send(event, context, response.SUCCESS, responseData);
  } catch (err) {
    console.error(err);
    response.send(event, context, response.FAILED, err);
  }
};
