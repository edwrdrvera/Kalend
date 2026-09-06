# Vercel deployment

## Waitlist rate limiting

The honeypot in `POST /api/waitlist` filters simple form-filling bots, but it is
not a rate limiter. Vercel must reject excessive requests before they reach the
public Route Handler and database.

Create and publish this Vercel Firewall rate-limit rule:

| Setting | Value |
| --- | --- |
| Environments | Production and Preview |
| Request method | `POST` |
| Request path | Equals `/api/waitlist` |
| Counting key | IP address |
| Algorithm | Fixed window |
| Window | 10 minutes |
| Request limit | 10 |
| Exceeded action | Rate limit with HTTP `429` |

The first 10 requests from one IP during a window may reach the handler. Vercel
must block the 11th and later requests with `429` until the window resets. Apply
the rule to both Production and Preview so preview deployments do not expose an
unthrottled public endpoint.

After publishing the rule, verify it against one Production URL and one Preview
URL. The application handles a `429` by keeping the entered email and asking the
visitor to wait 10 minutes before retrying. Local development does not emulate
the Vercel Firewall.
