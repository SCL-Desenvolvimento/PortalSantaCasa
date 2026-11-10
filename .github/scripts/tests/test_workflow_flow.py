"""Keep pull-request validation isolated from production deployment."""
from pathlib import Path
import re
import unittest


WORKFLOWS = Path(__file__).resolve().parents[2] / "workflows"


def read_workflow(name):
    path = WORKFLOWS / name
    if not path.is_file():
        raise AssertionError("Workflow esperado não existe: " + name)
    return path.read_text(encoding="utf-8")


def triggers(workflow):
    return re.search(r"(?ms)^on:\n(.*?)(?=^\S)", workflow).group(1)


class WorkflowFlowTests(unittest.TestCase):
    def test_pull_requests_validate_without_deploying(self):
        ci = read_workflow("validate-pr.yml")
        events = triggers(ci)
        self.assertIn("pull_request:", events)
        self.assertIn("branches: [master]", events)
        self.assertNotIn("push:", events)
        self.assertIn("uses: ./.github/workflows/build-validation.yml", ci)
        self.assertNotIn("self-hosted", ci)
        self.assertNotIn("environment:", ci)
        self.assertNotIn("  deploy:", ci)

    def test_new_commits_cancel_only_stale_validation_for_the_same_pr(self):
        ci = read_workflow("validate-pr.yml")
        cd = read_workflow("deploy-production.yml")
        self.assertIn("group: ci-pr-${{ github.event.pull_request.number || github.ref }}", ci)
        self.assertIn("cancel-in-progress: true", ci)
        self.assertIn("group: production", cd)
        self.assertIn("cancel-in-progress: false", cd)

    def test_production_builds_and_deploys_only_master(self):
        cd = read_workflow("deploy-production.yml")
        events = triggers(cd)
        self.assertIn("push:", events)
        self.assertIn("- master", events)
        self.assertIn("workflow_dispatch:", events)
        self.assertNotIn("pull_request:", events)
        build = cd.split("\n  build:", 1)[1].split("\n  deploy:", 1)[0]
        deploy = cd.split("\n  deploy:", 1)[1]
        self.assertIn("if: github.ref == 'refs/heads/master'", build)
        self.assertIn("uses: ./.github/workflows/build-validation.yml", build)
        self.assertIn("github.event_name != 'pull_request' && github.ref == 'refs/heads/master'", deploy)
        self.assertRegex(deploy, r"needs:\s+- build")
        self.assertIn("name: publish-server", deploy)
        self.assertIn("name: publish-realtime", deploy)
        # Downloads must stay in this run, never reuse artifacts from a PR.
        self.assertNotIn("run-id:", deploy)
        self.assertNotIn("workflow_run:", events)

    def test_shared_build_keeps_audit_tests_and_artifacts_without_deploy(self):
        build = read_workflow("build-validation.yml")
        self.assertIn("workflow_call:", triggers(build))
        self.assertNotIn("concurrency:", build)
        self.assertIn("runs-on: ubuntu-latest", build)
        for gate in ("npm ci", "npm audit --audit-level=moderate", "npm run lint",
                     "npm run test:ci", "npm run build -- --configuration production",
                     "dotnet test", "NuGetAuditMode=all"):
            self.assertIn(gate, build)
        for artifact in ("publish-server", "publish-realtime"):
            self.assertIn("name: " + artifact, build)
        self.assertNotIn("self-hosted", build)
        self.assertNotIn("  deploy:", build)


if __name__ == "__main__":
    unittest.main()
