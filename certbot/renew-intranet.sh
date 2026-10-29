#!/bin/sh
# Run on the Linux host. Docker credentials and DNS tokens are never logged.
set -eu
umask 077

container=fe-intranet-sp-santacasalorena-org-br
certificate=intranet.santacasalorena.org.br
lineage="/etc/letsencrypt/live/$certificate"
hook=/usr/local/sbin/certbot-reload-nginx
lock_file=${INTRANET_CERTBOT_LOCK_FILE:-/var/lib/scl-https-gateway/operation.lock}

log() {
    printf '%s %s\n' "$(date -Is)" "$*"
}

if [ "$(id -u)" -ne 0 ]; then
    log 'ERROR: execute this script as root.' >&2
    exit 1
fi

for required in docker flock; do
    if ! command -v "$required" >/dev/null 2>&1; then
        log "ERROR: required command not found: $required" >&2
        exit 1
    fi
done

# Descriptor stays open until this process exits; no stale lock cleanup is needed.
exec 9> "$lock_file"
if flock -n 9; then
    :
else
    lock_status=$?
    if [ "$lock_status" -eq 1 ]; then
        log 'SKIP: another renewal check is running.'
        exit 0
    fi
    log "ERROR: cannot acquire renewal lock (status $lock_status)." >&2
    exit "$lock_status"
fi

log "START: checking $certificate."
status=0
if docker exec --user 0 "$container" certbot renew \
    --cert-name "$certificate" \
    --non-interactive \
    --quiet \
    --deploy-hook "$hook"; then
    :
else
    status=$?
    log "ERROR: Certbot renewal failed (status $status)." >&2
fi

# A deploy hook can fail after a certificate has been saved. Retry pending
# reloads even when this run did not renew, or Certbot returned an error.
if docker exec --user 0 --env "RENEWED_LINEAGE=$lineage" \
    "$container" "$hook" --pending-only; then
    :
else
    reload_status=$?
    log "ERROR: Nginx reload is still pending (status $reload_status)." >&2
    if [ "$status" -eq 0 ]; then
        status=$reload_status
    fi
fi

if [ "$status" -eq 0 ]; then
    log 'OK: renewal check completed; no pending reload.'
else
    log "FAILED: renewal check ended with status $status." >&2
fi
exit "$status"
