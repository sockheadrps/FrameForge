# Private Ubuntu deployment

FrameForge is a personal application with no login. Keep it on localhost, a trusted LAN, or a private VPN; never forward its ports from the public internet.

This baseline uses:

- Node.js 22 and `systemd` for the application
- `127.0.0.1:3000` for the private application listener
- Caddy on TCP 443 for optional HTTPS access from another device
- SQLite's online backup command plus the managed-media directory for backups

Replace example hostnames, networks, and source paths before running commands.

## 1. Prepare Ubuntu

Install Node.js 22, npm, SQLite, Caddy, and a firewall tool through trusted Ubuntu/vendor packages. Verify the runtime before continuing:

```sh
node --version
npm --version
sqlite3 --version
caddy version
```

Create the service account and persistent directories:

```sh
sudo useradd --system --home /var/lib/frameforge --shell /usr/sbin/nologin frameforge
sudo install -d -o frameforge -g frameforge /var/lib/frameforge /var/lib/frameforge/media
sudo install -d -o root -g frameforge -m 0750 /etc/frameforge
sudo install -d -o frameforge -g frameforge /opt/frameforge/current
sudo install -d -o root -g root -m 0700 /var/backups/frameforge
```

Copy the repository into `/opt/frameforge/current`, then install and build as the service account:

```sh
cd /opt/frameforge/current
sudo -u frameforge npm ci
sudo -u frameforge npm run build
```

## 2. Configure systemd

```sh
sudo cp deploy/frameforge.env.example /etc/frameforge/frameforge.env
sudo chown root:frameforge /etc/frameforge/frameforge.env
sudo chmod 0640 /etc/frameforge/frameforge.env
sudo cp deploy/systemd/frameforge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now frameforge
curl --fail http://127.0.0.1:3000/healthz
```

The health request should return `{"status":"ok"}`. Inspect failures with:

```sh
sudo systemctl status frameforge
sudo journalctl -u frameforge -n 100 --no-pager
```

`HOST=127.0.0.1` deliberately prevents direct LAN access to port 3000.

The deployment environment approves `/mnt/data/comfy/output` as a read-only linked-media root. Ensure the `frameforge` service account can traverse and read that mount without granting it write access:

```sh
sudo -u frameforge find /mnt/data/comfy/output -maxdepth 2 -type d -print | head
```

FrameForge will preserve and navigate subfolders beneath that root. Additional approved roots can be added to `FRAMEFORGE_LINKED_MEDIA_ROOTS` with semicolons. Never approve `/`, `/mnt`, a home directory, or another broad filesystem location.

## 3. Optional private HTTPS access

Choose a private hostname such as `frameforge.lan`. Point it to the Ubuntu host using private DNS or the Windows hosts file, and update both `/etc/frameforge/frameforge.env` and `deploy/caddy/Caddyfile` with the same hostname.

```sh
sudo cp deploy/caddy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

The supplied Caddy configuration uses its internal certificate authority. Transfer Caddy's local root certificate to the Windows machine over a trusted channel and install it only in that machine's Trusted Root Certification Authorities store. Do not distribute that private root publicly.

If HTTPS is unnecessary, use a private VPN or SSH port forwarding instead of exposing Node directly.

## 4. Firewall boundary

Never copy these example rules without replacing `192.168.1.0/24` with the actual trusted LAN or VPN range. Preserve SSH access before enabling a remote firewall.

```sh
sudo ufw allow OpenSSH
sudo ufw allow from 192.168.1.0/24 to any port 443 proto tcp
sudo ufw deny 3000/tcp
sudo ufw enable
sudo ufw status verbose
```

Do not create router port-forwarding rules for FrameForge or Caddy.

## 5. Backup and restore

The backup script creates a consistent SQLite snapshot, runs an integrity check, copies managed media, and writes a versioned archive:

```sh
sudo chmod 0755 deploy/scripts/backup.sh deploy/scripts/restore.sh
sudo deploy/scripts/backup.sh /var/backups/frameforge
```

Enable daily backups:

```sh
sudo cp deploy/systemd/frameforge-backup.service deploy/systemd/frameforge-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now frameforge-backup.timer
sudo systemctl list-timers frameforge-backup.timer
```

Copy backup archives to a different physical machine or storage device. A backup left only on the FrameForge host is not sufficient.

Restore replaces the active database and managed-media directory. Verify the archive path and stop production work before running it:

```sh
sudo deploy/scripts/restore.sh /var/backups/frameforge/frameforge-YYYYMMDDTHHMMSSZ.tar.gz --confirm-replace
```

Test restore on the Ubuntu target before relying on the process:

1. Create a recognizable temporary project and run a backup.
2. Modify or remove that temporary project.
3. Run the restore command using the new archive.
4. Confirm `/healthz` succeeds and the temporary project returns.
5. Confirm images/videos open after Phase 4 adds managed media.

## 6. Windows verification

From the Windows machine:

```powershell
Resolve-DnsName frameforge.lan
Test-NetConnection frameforge.lan -Port 443
curl.exe --fail https://frameforge.lan/healthz
```

Then open `https://frameforge.lan` in the browser, create a test project, restart the Ubuntu service, and confirm the project remains available.

The deployment phase is complete only after the backup/restore rehearsal and Windows checks succeed on the actual host.

## 7. Upgrades and migrations

Every production build contains ordered Drizzle migrations. Back up the database and managed-media directory before changing versions, then install dependencies, build, and apply migrations while the service is stopped:

```sh
sudo systemctl stop frameforge
sudo deploy/scripts/backup.sh /var/backups/frameforge
npm ci
npm run build
npm run db:migrate
sudo systemctl start frameforge
curl --fail http://127.0.0.1:3000/healthz
```

Do not edit an existing migration after it has reached the Ubuntu host. Add a new migration instead. If an upgrade fails, keep the service stopped and restore the just-created archive before returning to the previous application revision.

The Settings page reports SQLite integrity, record counts, approved linked roots, Node, FFmpeg, and FFprobe versions. Unexpected server errors are emitted as one-line JSON records and can be inspected with `journalctl -u frameforge`.

Portable project packages are separate from host backups. They include project records and managed media, assign collision-safe IDs when imported, and warn about linked files that cannot be embedded. Use host backups for disaster recovery and packages for moving individual projects.
