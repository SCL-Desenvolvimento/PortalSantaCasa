#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
script="$script_dir/../sync-infrastructure.sh"
temp_base=${INTRANET_TEST_WORKDIR:-${TMPDIR:-/tmp}}
mkdir -p -- "$temp_base"
temp_base=$(cd -- "$temp_base" && pwd -P)
test_root=$(mktemp -d "$temp_base/sync-infrastructure.XXXXXX")

cleanup() {
    local resolved
    resolved=$(cd -- "$test_root" && pwd -P) || return 1
    if [[ "$resolved" != "$test_root" || "${test_root%/*}" != "$temp_base" ||
          "${test_root##*/}" != sync-infrastructure.?????? ]]; then
        printf 'Unsafe test cleanup path: %s\n' "$test_root" >&2
        return 1
    fi
    rm -rf -- "$test_root"
}
trap cleanup EXIT

passed=0
skipped=0
case_number=0

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
pass() { passed=$((passed + 1)); printf 'PASS: %s\n' "$*"; }
skip() { skipped=$((skipped + 1)); printf 'SKIP: %s\n' "$*"; }

fixture() {
    case_number=$((case_number + 1))
    source_dir="$test_root/case $case_number/source tree"
    deploy_dir="$test_root/case $case_number/deploy tree"
    mkdir -p "$source_dir/nginx" "$source_dir/certbot" "$deploy_dir"
    printf 'new Dockerfile\n' > "$source_dir/Dockerfile"
    printf 'new realtime Dockerfile\n' > "$source_dir/Dockerfile.realtime"
    printf 'services: {}\n' > "$source_dir/docker-compose.yml"
    printf '#!/bin/bash\nexit 0\n' > "$source_dir/entrypoint.sh"
    printf 'server { listen 443 ssl; }\n' > "$source_dir/nginx/intranet.conf"
    printf '#!/bin/sh\nexit 0\n' > "$source_dir/certbot/reload-nginx.sh"
    printf 'old Dockerfile\n' > "$deploy_dir/Dockerfile"
}

run_sync() {
    bash "$script" "$source_dir" "$deploy_dir" > "$test_root/output" 2>&1
}

expect_failure() {
    if run_sync; then
        fail "sync unexpectedly succeeded: $*"
    fi
    [[ "$(cat "$deploy_dir/Dockerfile")" == 'old Dockerfile' ]] || fail 'failure modified production files'
    pass "$*"
}

fixture
mkdir -p "$source_dir/nginx/snippets with spaces" "$source_dir/certbot/hooks"
printf 'include content\n' > "$source_dir/nginx/snippets with spaces/proxy.conf"
printf '#!/bin/sh\nexit 0\n' > "$source_dir/certbot/hooks/extra.sh"
printf 'source secret must not deploy\n' > "$source_dir/.env"
printf 'production secret\n' > "$deploy_dir/.env"
mkdir -p "$deploy_dir/app/Uploads" "$deploy_dir/realtime" "$deploy_dir/letsencrypt/live"
printf 'upload\n' > "$deploy_dir/app/Uploads/keep.txt"
printf 'running application\n' > "$deploy_dir/app/application.dll"
printf 'running realtime\n' > "$deploy_dir/realtime/application.dll"
printf 'private certificate\n' > "$deploy_dir/letsencrypt/live/privkey.pem"
run_sync || { cat "$test_root/output" >&2; fail 'sync failed on valid inputs'; }
for relative in Dockerfile Dockerfile.realtime docker-compose.yml entrypoint.sh \
    nginx/intranet.conf certbot/reload-nginx.sh \
    'nginx/snippets with spaces/proxy.conf' certbot/hooks/extra.sh; do
    cmp "$source_dir/$relative" "$deploy_dir/$relative" || fail "missing/changed file: $relative"
done
pass 'copies infrastructure, nested files, and paths containing spaces'
[[ "$(cat "$deploy_dir/.env")" == 'production secret' ]] || fail '.env was replaced'
[[ "$(cat "$deploy_dir/app/Uploads/keep.txt")" == upload ]] || fail 'upload was changed'
[[ "$(cat "$deploy_dir/app/application.dll")" == 'running application' ]] || fail 'app was changed'
[[ "$(cat "$deploy_dir/realtime/application.dll")" == 'running realtime' ]] || fail 'realtime was changed'
[[ "$(cat "$deploy_dir/letsencrypt/live/privkey.pem")" == 'private certificate' ]] || fail 'certificate was changed'
pass 'preserves .env, uploads, application artifacts, and certificate data'

printf 'updated Nginx\n' > "$source_dir/nginx/intranet.conf"
printf 'server-only file\n' > "$deploy_dir/nginx/server-only.conf"
run_sync || fail 'repeat sync failed'
cmp "$source_dir/nginx/intranet.conf" "$deploy_dir/nginx/intranet.conf" || fail 'updated configuration not applied'
[[ "$(cat "$deploy_dir/nginx/server-only.conf")" == 'server-only file' ]] || fail 'extra production file removed'
pass 'updates files repeatedly without removing extra production files'

fixture
rm -f -- "$source_dir/certbot/reload-nginx.sh"
expect_failure 'missing required source fails before copying'

fixture
printf '#!/bin/bash\nif then\n' > "$source_dir/entrypoint.sh"
expect_failure 'invalid entrypoint fails before copying'

fixture
printf '#!/bin/sh\nif then\n' > "$source_dir/certbot/reload-nginx.sh"
expect_failure 'invalid Certbot hook fails before copying'

fixture
printf 'not a directory\n' > "$deploy_dir/nginx"
expect_failure 'non-directory target fails before copying'

fixture
if bash "$script" "$source_dir" "$source_dir" > "$test_root/output" 2>&1; then
    fail 'identical source and destination accepted'
fi
pass 'rejects identical source and destination'

fixture
mkdir -p "$source_dir/nested deployment"
if bash "$script" "$source_dir" "$source_dir/nested deployment" > "$test_root/output" 2>&1; then
    fail 'deployment nested inside source accepted'
fi
pass 'rejects deployment nested inside checkout'

fixture
cp -R -- "$source_dir" "$deploy_dir/source checkout"
if bash "$script" "$deploy_dir/source checkout" "$deploy_dir" > "$test_root/output" 2>&1; then
    fail 'source nested inside deployment accepted'
fi
[[ "$(cat "$deploy_dir/Dockerfile")" == 'old Dockerfile' ]] || fail 'overlap modified production files'
pass 'rejects checkout nested inside deployment'

fixture
if bash "$script" "$source_dir" "$deploy_dir/missing" > "$test_root/output" 2>&1; then
    fail 'missing deploy directory accepted'
fi
[[ ! -e "$deploy_dir/missing" ]] || fail 'missing deploy directory was created'
pass 'requires an existing deployment directory'

fixture
if bash "$script" "$source_dir" > "$test_root/output" 2>&1; then
    fail 'missing destination argument accepted'
fi
pass 'rejects missing arguments'

fixture
mkdir -p "$test_root/external"
ln -s "$test_root/external" "$deploy_dir/nginx" 2>/dev/null || true
if [[ -L "$deploy_dir/nginx" ]]; then
    expect_failure 'rejects a destination directory symlink'
    [[ ! -e "$test_root/external/intranet.conf" ]] || fail 'wrote outside deploy directory'
else
    skip 'native directory symlinks unavailable in this environment'
fi

fixture
printf 'external source\n' > "$test_root/external.conf"
rm -f -- "$source_dir/nginx/intranet.conf"
ln -s "$test_root/external.conf" "$source_dir/nginx/intranet.conf" 2>/dev/null || true
if [[ -L "$source_dir/nginx/intranet.conf" ]]; then
    expect_failure 'rejects source symlinks before copying'
else
    skip 'native file symlinks unavailable in this environment'
fi

fixture
chmod a-w "$deploy_dir"
if [[ ! -w "$deploy_dir" ]]; then
    expect_failure 'rejects insufficient deployment permissions before copying'
else
    skip 'readonly permissions not enforced for the current user/filesystem'
fi
chmod u+w "$deploy_dir"

# Execute the actual validation body from the workflow. Map only container
# filesystem paths to fixtures; Nginx and Python are external boundaries.
workflow="$script_dir/../../workflows/deploy-production.yml"
validation_body=$(awk '
    /name: Validar Nginx e automação de certificados/ { in_step = 1; next }
    in_step && /docker compose run/ && /app -ec/ { in_command = 1; next }
    in_command && NF == 1 && $1 == sprintf("%c", 39) { exit }
    in_command { sub(/^            /, ""); print }
' "$workflow")
[[ -n "$validation_body" ]] || fail 'Nginx image validation command missing from workflow'
validation_body=${validation_body//\/etc\/hosts/\"\$VALIDATION_HOSTS\"}
validation_body=${validation_body//\/usr\/local\/sbin\/certbot-reload-nginx/\"\$VALIDATION_HOOK\"}
validation_body=${validation_body//\/run\/letsencrypt-secrets\/cloudflare.ini/\"\$VALIDATION_CREDENTIALS\"}

validation_bin="$test_root/validation-bin"
mkdir -p "$validation_bin"
printf '127.0.0.1 localhost\n' > "$test_root/validation-hosts"
printf 'dummy credential\n' > "$test_root/validation-credentials"
cat > "$validation_bin/nginx" <<'NGINX'
#!/usr/bin/env bash
set -euo pipefail
[[ "$*" == '-t' ]] || exit 95
# Simulate Realtime being absent from Docker DNS. Resolution must come from
# the temporary validation container's hosts file.
grep -Eq '^127\.0\.0\.1[[:space:]]+realtime([[:space:]]|$)' "$VALIDATION_HOSTS" || exit 1
exit "${NGINX_TEST_RESULT:-0}"
NGINX
cat > "$validation_bin/python3" <<'PYTHON'
#!/usr/bin/env bash
[[ "$*" == '-c import certbot_dns_cloudflare' ]]
PYTHON
chmod +x "$validation_bin/nginx" "$validation_bin/python3"

run_validation() {
    PATH="$validation_bin:$PATH" \
        VALIDATION_HOSTS="$test_root/validation-hosts" \
        VALIDATION_CREDENTIALS="$test_root/validation-credentials" \
        VALIDATION_HOOK="$script_dir/../../../certbot/reload-nginx.sh" \
        bash -ec "$validation_body" > "$test_root/output" 2>&1
}

run_validation || { cat "$test_root/output" >&2; fail 'Nginx validation depends on a running Realtime service'; }
pass 'workflow validates Nginx when Realtime is absent from Docker DNS'
if NGINX_TEST_RESULT=1 run_validation; then
    fail 'invalid Nginx configuration did not fail workflow validation'
fi
pass 'workflow validation still fails on invalid Nginx configuration'

printf '\n%s tests passed; %s skipped.\n' "$passed" "$skipped"
