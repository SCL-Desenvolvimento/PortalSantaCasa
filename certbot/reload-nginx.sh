#!/bin/sh
# Certbot deploy hook. Keep a durable marker until Nginx accepts the reload.
set -eu

: "${RENEWED_LINEAGE:?Certbot must provide RENEWED_LINEAGE}"
pending_file="$RENEWED_LINEAGE/.nginx-reload-pending"

case "${1:-}" in
    '')
        : > "$pending_file"
        ;;
    --pending-only)
        if [ ! -f "$pending_file" ]; then
            exit 0
        fi
        ;;
    *)
        printf '%s\n' 'Usage: certbot-reload-nginx [--pending-only]' >&2
        exit 2
        ;;
esac

nginx -t
expected_fingerprint=$(openssl x509 -in "$RENEWED_LINEAGE/fullchain.pem" \
    -noout -fingerprint -sha256)
nginx -s reload

# Sending HUP is asynchronous. Confirm the certificate on a new local TLS
# connection before clearing the marker; Nginx may reject the new config.
for attempt in 1 2 3 4 5; do
    if served_fingerprint=$(timeout 5 openssl s_client \
        -connect 127.0.0.1:443 \
        -servername intranet.santacasalorena.org.br \
        -showcerts </dev/null 2>/dev/null \
        | openssl x509 -noout -fingerprint -sha256 2>/dev/null); then
        if [ "$served_fingerprint" = "$expected_fingerprint" ]; then
            rm -f "$pending_file"
            printf '%s\n' 'Certificate applied: local TLS fingerprint verified.'
            exit 0
        fi
    fi
    if [ "$attempt" -lt 5 ]; then
        sleep 1
    fi
done

printf '%s\n' 'ERROR: local TLS certificate does not match; reload remains pending.' >&2
exit 1
