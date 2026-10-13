/** The one chip: 26px tall, pill-shaped, 12px semibold. Pass it to a `Toggle`
 *  for a pressable chip or to a `Button` for an action chip. */
export const CHIP_CLS =
  "h-[26px] min-w-0 gap-1.5 rounded-full border border-border bg-card px-3 text-xs leading-normal font-semibold text-muted-foreground hover:bg-hover hover:text-foreground";

/** A dashed chip that offers something not yet chosen. */
export const CHIP_EMPTY_CLS = "border-dashed border-muted-foreground/40";

/** A quiet text action ("Show more", breadcrumbs). Pass it to `Button variant="link"`. */
export const QUIET_LINK_CLS =
  "h-auto rounded-sm p-0 text-xs leading-normal font-semibold text-muted-foreground hover:text-foreground hover:no-underline";

/** The chip look for a `SelectTrigger`, which sets its height and radius per `data-size`. */
export const CHIP_SELECT_CLS = "data-[size=sm]:h-[26px] data-[size=sm]:rounded-full";
