"""Public deployment contract; no Docker, network access or credentials required."""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[3]


class IndependentGatewayTests(unittest.TestCase):
    def test_api_image_has_no_https_gateway(self):
        dockerfile = (ROOT / "Dockerfile").read_text(encoding='utf-8')
        self.assertNotRegex(dockerfile.lower(), r"nginx|certbot|expose (80|443)\b")
        self.assertIn("http://0.0.0.0:8080", dockerfile)
        self.assertIn("exec dotnet PortalSantaCasa.Server.dll", (ROOT / "entrypoint.sh").read_text(encoding='utf-8'))

    def test_public_site_preserves_realtime_contract(self):
        site = json.loads((ROOT / "gateway/site.json").read_text(encoding='utf-8'))
        self.assertEqual(site["upstream"], "http://scl-intranet:8080")
        self.assertEqual(site["client_max_body_size"], "600M")
        self.assertEqual(site["routes"], [{"path": "/realtime/", "upstream": "http://scl-intranet-realtime:8080", "strip_prefix": True, "websocket": True, "timeout_seconds": 86400}])

    def test_network_trust_and_no_application_tls_ownership(self):
        compose = (ROOT / "docker-compose.yml").read_text(encoding='utf-8')
        app = compose.split("  realtime:")[0]
        self.assertNotIn("    ports:", app)
        self.assertNotIn("/etc/letsencrypt", compose)
        self.assertNotIn("letsencrypt_intranet", compose)
        self.assertIn("/home/santacasalorena-org-br/intranet/docker/app/Uploads:/app/Uploads", app)
        for alias in ("scl-intranet", "scl-intranet-realtime"):
            self.assertIn(alias, compose)
        self.assertEqual(compose.count("      - .gateway.env"), 2)
        self.assertRegex(compose, r"https_gateway:\s+external: true\s+name: scl-https-proxy")

    def test_only_master_can_deploy_and_readiness_precedes_copies(self):
        workflow = (ROOT / ".github/workflows/deploy-production.yml").read_text(encoding='utf-8')
        deploy = workflow.split("\n  deploy:", 1)[1]
        self.assertIn("github.event_name != 'pull_request' && github.ref == 'refs/heads/master'", deploy)
        self.assertLess(deploy.index("/usr/local/sbin/scl-https-gateway check"), deploy.index("scripts/sync-infrastructure.sh"))
        self.assertLess(deploy.index("Verificar containers"), deploy.index("publish --repository"))
        self.assertIn('publish --repository "$GITHUB_REPOSITORY" --file', deploy)
        self.assertNotIn("nginx -t", deploy)
        self.assertNotIn("flock", deploy)
        self.assertNotIn("docker image prune", deploy)
        self.assertIn('headers={"X-Forwarded-Proto":"https"}', deploy)
        self.assertIn('http.client.HTTPConnection("scl-intranet", 8080', deploy)
        self.assertIn('assert r.status == 200', deploy)

    def test_forwarded_configuration_is_used_by_both_services(self):
        for project in ("PortalSantaCasa.Server", "PortalSantaCasa.Realtime"):
            program = (ROOT / project / "Program.cs").read_text(encoding='utf-8')
            self.assertIn("TrustedReverseProxy.Configure(options, builder.Configuration)", program)
            self.assertLess(program.index("app.UseForwardedHeaders()"), program.index("app.UseAuthentication()"))


if __name__ == "__main__":
    unittest.main()
