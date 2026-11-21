/** Invitation rules, agreed with the product owner (see HANDOFF). */
export const INVITE_TTL_DAYS = 7;
export const INVITE_RESEND_COOLDOWN_DAYS = 2;
export const INVITE_MAX_SENDS = 3;
export const INVITE_RATE_LIMIT = 20;
export const INVITE_RATE_WINDOW_HOURS = 24;

export const INVITE_TTL_MS = INVITE_TTL_DAYS * 24 * 60 * 60 * 1000;
export const INVITE_RESEND_COOLDOWN_MS =
  INVITE_RESEND_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
export const INVITE_RATE_WINDOW_MS = INVITE_RATE_WINDOW_HOURS * 60 * 60 * 1000;
