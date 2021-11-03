#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import appConfig from "../app.config";
import { SingleGitlabRunnerStack } from "../lib/single-gitlab-runner-stack";

const app = new cdk.App();
new SingleGitlabRunnerStack(app, "SingleGitlabRunnerStack", {
  ...appConfig.SingleGitlabRunnerStack,
});
