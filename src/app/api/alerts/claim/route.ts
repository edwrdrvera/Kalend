import { claimDueAlerts } from "@/lib/api/alert-claim";
import { withUser, ok } from "@/lib/api/route-handler";

/** The open tab's delivery path. The push check calls the same claim. */
export const POST = withUser(async (_request, _context, user) => {
  return ok(await claimDueAlerts(user));
});
