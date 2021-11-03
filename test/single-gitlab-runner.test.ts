import * as cdk from "aws-cdk-lib";
import * as SingleGitlabRunner from "../lib/single-gitlab-runner-stack";

describe("stack", () => {
  test("snapshot", () => {
    const app = new cdk.App();
    const stack = new SingleGitlabRunner.SingleGitlabRunnerStack(app, "Stack", {
      enableVpcFlowLog: true,
      deleteDefaultSecurityGroup: true,
    });
    const template = app.synth().getStackArtifact(stack.artifactId).template;
    expect(template).toMatchSnapshot();
  });
});
