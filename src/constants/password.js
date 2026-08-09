/**
 * Client-side mirror of server/passwords.js MIN_PASSWORD_LENGTH.
 *
 * The server is the authority — it rejects anything shorter regardless of what
 * the form allows. This exists so the user finds out before submitting, and so
 * the two places that set a password (signup, reset) can't drift apart.
 *
 * NOTE: deliberately NOT applied to the login forms. Accounts created under the
 * old 6-character minimum still exist; blocking them at the login field would
 * lock those users out of the very flow they need to reach in order to reset.
 */
export const MIN_PASSWORD_LENGTH = 10;
