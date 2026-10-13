# Alerts when Kalend is closed

The app checks for due alerts once a minute and sends them to devices that turned the setting on. The check is `POST /api/alerts/push-due`. It refuses the call unless the `Authorization` header is `Bearer` plus `ALERT_PUSH_SECRET`.

The owner installs this timer on the VPS. Nothing in this repo starts it, and it is not deployed from a pull request.

## Environment

Generate a key pair with `bunx web-push generate-vapid-keys`. Put these in the app environment. `.env.example` lists them with empty values. Never commit real values.

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, the one public key. The browser and the sender both read it. It is baked into the client at build time. Rotating it needs a rebuild.
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`, a contact address such as `mailto:alerts@example.com`
- `ALERT_PUSH_SECRET`, a long random string

The timer reads `ALERT_PUSH_SECRET` and `ALERT_PUSH_URL` from `/etc/kalend/alert-push.env` on the server. Do not put the secret in the unit file.

```
ALERT_PUSH_SECRET=<the same secret the app uses>
ALERT_PUSH_URL=<where the check lives, see below>
```

## Install

```bash
sudo cp guides/kalend-alert-push.service /etc/systemd/system/
sudo cp guides/kalend-alert-push.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kalend-alert-push.timer
```

systemd starts the check one minute after boot, then one minute after each run finishes. The timer is not persistent, so a gap after downtime does not burst a pile of old alerts. An alert that is already more than five minutes late stays for the open tab to list as missed.

`ALERT_PUSH_URL` is the full address of the check. Pick the one that matches where Kalend runs.

On a VPS where this machine serves the app, point it at this machine:

```
ALERT_PUSH_URL=http://127.0.0.1/api/alerts/push-due
```

Caddy, or whatever fronts the app, must answer that address. The route is left out of the login redirect so this call is not sent to the login page.

When Kalend is hosted on Vercel, this machine is not the app. Point the timer at the public host instead:

```
ALERT_PUSH_URL=https://your-app.vercel.app/api/alerts/push-due
```

Use the production host. That deployment needs the same bearer secret. Vercel cron is not used. The timer still runs on a machine you control.

Confirm it is scheduled:

```bash
systemctl list-timers kalend-alert-push.timer
```

## Turn it off

```bash
sudo systemctl disable --now kalend-alert-push.timer
```

## What a failed send does

A device that reports the subscription is gone (HTTP 404 or 410) is removed. If no device accepts the alert, it is unmarked so the next check or an open tab can still deliver it. A device with repeated temporary failures gets that alert again once a minute for up to five minutes. That retry is accepted. If at least one device accepts it, the alert stays marked fired. A failed send to another device is logged, and that device does not get a retry. That keeps the devices that already showed it from getting a second copy.

If a check stops after it has taken an alert and before it records that the send finished, the next check sends that alert. A claim that was confirmed, or that was taken by an open tab, is not sent again.
