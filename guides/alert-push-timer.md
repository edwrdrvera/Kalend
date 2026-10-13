# Alerts when Kalend is closed

The app checks for due alerts once a minute and sends them to devices that turned the setting on. The check is `POST /api/alerts/push-due`. It refuses the call unless the `Authorization` header is `Bearer` plus `ALERT_PUSH_SECRET`.

The owner installs this timer on the VPS. Nothing in this repo starts it, and it is not deployed from a pull request.

## Environment

Generate a key pair with `bunx web-push generate-vapid-keys`. Put these in the app environment. `.env.example` lists them with empty values. Never commit real values.

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`, a contact address such as `mailto:alerts@example.com`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, the same public key, so the browser can subscribe
- `ALERT_PUSH_SECRET`, a long random string

The timer reads only `ALERT_PUSH_SECRET`, from `/etc/kalend/alert-push.env` on the server:

```
ALERT_PUSH_SECRET=<the same secret the app uses>
```

Do not put the secret in the unit file.

## Install

```bash
sudo cp guides/kalend-alert-push.service /etc/systemd/system/
sudo cp guides/kalend-alert-push.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kalend-alert-push.timer
```

systemd starts the check one minute after boot, then one minute after each run finishes. The timer is not persistent, so a gap after downtime does not burst a pile of old alerts. An alert that is already more than five minutes late stays for the open tab to list as missed.

Caddy, or whatever fronts the app, must answer `http://127.0.0.1/api/alerts/push-due` on the server. The route is left out of the login redirect so this call is not sent to the login page.

Confirm it is scheduled:

```bash
systemctl list-timers kalend-alert-push.timer
```

## Turn it off

```bash
sudo systemctl disable --now kalend-alert-push.timer
```

## What a failed send does

A device that reports the subscription is gone (HTTP 404 or 410) is removed. Any other send failure is logged, and the alert stays marked fired. The open tab will not show it again. That is the accepted trade-off so one failing device cannot make the same alert fire on every later minute.
