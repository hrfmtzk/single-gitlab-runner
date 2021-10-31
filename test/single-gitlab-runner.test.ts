import * as cdk from 'aws-cdk-lib';
import * as SingleGitlabRunner from '../lib/single-gitlab-runner-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new SingleGitlabRunner.SingleGitlabRunnerStack(app, 'MyTestStack');
    // THEN
    const actual = app.synth().getStackArtifact(stack.artifactId).template;
    expect(actual.Resources ?? {}).toEqual({});
});
