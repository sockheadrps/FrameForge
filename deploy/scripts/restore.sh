#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 || "$2" != "--confirm-replace" ]]; then
	echo "Usage: $0 /path/to/frameforge-backup.tar.gz --confirm-replace" >&2
	exit 2
fi

archive="$(realpath "$1")"
environment_file="${FRAMEFORGE_ENV_FILE:-/etc/frameforge/frameforge.env}"
[[ -f "$archive" ]] || { echo "Backup not found: $archive" >&2; exit 1; }
[[ -r "$environment_file" ]] || { echo "Cannot read $environment_file" >&2; exit 1; }

set -a
# shellcheck disable=SC1090
source "$environment_file"
set +a
: "${FRAMEFORGE_DATABASE_PATH:?FRAMEFORGE_DATABASE_PATH is required}"
: "${FRAMEFORGE_MEDIA_ROOT:?FRAMEFORGE_MEDIA_ROOT is required}"

work_dir="$(mktemp -d)"
trap 'rm -rf -- "$work_dir"' EXIT
tar -C "$work_dir" -xzf "$archive"
grep -qx 'format=frameforge-backup-v1' "$work_dir/manifest.txt"
sqlite3 "$work_dir/data/frameforge.db" 'PRAGMA integrity_check;' | grep -qx 'ok'

systemctl stop frameforge
install -d -o frameforge -g frameforge "$(dirname "$FRAMEFORGE_DATABASE_PATH")" "$FRAMEFORGE_MEDIA_ROOT"
install -o frameforge -g frameforge -m 0640 "$work_dir/data/frameforge.db" "$FRAMEFORGE_DATABASE_PATH"
find "$FRAMEFORGE_MEDIA_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
cp -a -- "$work_dir/data/media/." "$FRAMEFORGE_MEDIA_ROOT/"
chown -R frameforge:frameforge "$FRAMEFORGE_MEDIA_ROOT"
systemctl start frameforge
curl --fail --silent http://127.0.0.1:3000/healthz >/dev/null
echo "Restore completed and FrameForge is healthy."
