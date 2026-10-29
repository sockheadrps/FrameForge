#!/usr/bin/env bash
set -euo pipefail

environment_file="${FRAMEFORGE_ENV_FILE:-/etc/frameforge/frameforge.env}"
backup_root="${1:-/var/backups/frameforge}"

if [[ ! -r "$environment_file" ]]; then
	echo "Cannot read $environment_file" >&2
	exit 1
fi

set -a
# shellcheck disable=SC1090
source "$environment_file"
set +a

: "${FRAMEFORGE_DATABASE_PATH:?FRAMEFORGE_DATABASE_PATH is required}"
: "${FRAMEFORGE_MEDIA_ROOT:?FRAMEFORGE_MEDIA_ROOT is required}"

umask 077
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
work_dir="$(mktemp -d)"
trap 'rm -rf -- "$work_dir"' EXIT
mkdir -p -- "$backup_root" "$work_dir/data"

# SQLite's online backup command produces a consistent snapshot while FrameForge is running.
sqlite3 "$FRAMEFORGE_DATABASE_PATH" ".backup '$work_dir/data/frameforge.db'"
sqlite3 "$work_dir/data/frameforge.db" 'PRAGMA integrity_check;' | grep -qx 'ok'

if [[ -d "$FRAMEFORGE_MEDIA_ROOT" ]]; then
	cp -a -- "$FRAMEFORGE_MEDIA_ROOT" "$work_dir/data/media"
else
	mkdir -p -- "$work_dir/data/media"
fi

cat > "$work_dir/manifest.txt" <<EOF
format=frameforge-backup-v1
created_utc=$timestamp
EOF

archive="$backup_root/frameforge-$timestamp.tar.gz"
tar -C "$work_dir" -czf "$archive" manifest.txt data
echo "$archive"
