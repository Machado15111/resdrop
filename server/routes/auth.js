import { Router } from 'express';
import * as db from '../db.js';
import { isAdminEmail } from '../admins.js';
import { PLANS } from '../planAuthz.js';
import { generateToken } from '../tokens.js';
import { hashPassword, verifyPassword, rehashIfWeak, burnCompare, validatePassword, messageFor, BCRYPT_COST } from '../passwords.js';
import { sendWelcomeEmail, sendAdminNotification, sendPasswordReset } from '../email.js';

/**
 * Authentication and user-account routes: login, signup, logout, me,
 * forgot/reset password, onboarding, profile, currencies, and the account
 * read at GET /users/:email.
 *
 * Extracted from index.js verbatim — same paths, same middleware chains, same
 * handler bodies. The rate limiters are passed in rather than rebuilt so every
 * route keeps sharing the one bucket store in rateLimit.js.
 */
export default function authRoutes({
  authMiddleware, authRateLimit, signupRateLimit, resetRateLimit, resetSubmitLimit,
}) {
  const router = Router();

  // ─── AUTH & USER ROUTES ─────────────────────────────────────
  router.post('/auth/login', authRateLimit, async (req, res) => {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatorio' });
    if (!password) return res.status(400).json({ error: 'Senha obrigatoria' });

    const userWithPw = await db.getUserWithPassword(email);

    // Security: Don't reveal whether user exists — generic error for all failures.
    // The generic MESSAGE was not enough on its own: returning immediately made a
    // miss ~0ms while a hit paid the full bcrypt cost, and that timing gap is
    // itself an enumeration oracle. Burn the same work either way.
    if (!userWithPw || !userWithPw.passwordHash) {
      await burnCompare(password);
      if (userWithPw && !userWithPw.passwordHash) {
        return res.status(401).json({ error: 'Conta requer redefinicao de senha. Use "Esqueci minha senha".' });
      }
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const valid = await verifyPassword(password, userWithPw.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Credenciais invalidas' });

    // Transparent upgrade: hashes made at the old cost factor are re-hashed at
    // the current one now, while the plaintext is legitimately in hand. Best
    // effort — a failure here must never block a valid login.
    try {
      const upgraded = await rehashIfWeak(password, userWithPw.passwordHash);
      if (upgraded) {
        await db.updateUser(email, { passwordHash: upgraded });
        console.log(`[Auth] rehashed password for ${email.toLowerCase()} at cost ${BCRYPT_COST}`);
      }
    } catch (e) {
      console.error('[Auth] password rehash failed (login continues):', e.message);
    }

    await db.updateUser(email, { lastActive: new Date().toISOString() });
    await db.updateUserStats(email);

    const token = generateToken();
    await db.createSession(email.toLowerCase(), token);

    const user = await db.getUser(email);
    res.json({ user: { ...user, isAdmin: isAdminEmail(user?.email) }, token });
  });

  router.post('/auth/signup', signupRateLimit, async (req, res) => {
    const { email, name, password, phone, currency, country, lang } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatorio' });
    const pwCheck = validatePassword(password);
    if (!pwCheck.ok) {
      return res.status(400).json({ error: messageFor(pwCheck, lang), code: pwCheck.code });
    }
    // Security: Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: lang === 'en' ? 'Please enter a valid email address' : 'Digite um e-mail valido',
        code: 'EMAIL_INVALID',
      });
    }
    const existing = await db.getUser(email);
    // Security: worded conditionally ("if you already have an account")
    // rather than asserting one exists, so this reads the same whether or
    // not it does. The 409 status code and ACCOUNT_EXISTS code are already
    // distinguishable from a 400/500 by anyone probing the endpoint (that
    // predates this message and isn't something a wording change fixes) —
    // but there's no reason for the copy itself to confirm it outright.
    if (existing) {
      return res.status(409).json({
        error: lang === 'en'
          ? "We couldn't complete signup with these details. If you already have an account, try logging in or resetting your password."
          : 'Nao foi possivel concluir o cadastro com estes dados. Se voce ja tem uma conta, tente fazer login ou redefinir sua senha.',
        code: 'ACCOUNT_EXISTS',
      });
    }

    const passwordHash = await hashPassword(password);

    // Insert new user via Supabase REST — the authoritative account store
    // everywhere else in this app (login, sessions, onboarding all read
    // through it). This used to insert via a raw SQL connection to
    // DATABASE_URL when that env var was set — a DIFFERENT database (Neon,
    // not Supabase) in this deployment. Every fresh signup landed a row
    // nothing else could see: the user immediately failed "User not found" on
    // /auth/onboarding, "Credenciais invalidas" on the very next login with
    // the correct password, and a silent no-op on forgot-password. See
    // getUserWithPassword's comment for why REST must be the only path.
    //
    // passwordHash/phone/currency/country go in the SAME insert as
    // email/name (createUser's extraFields), not a separate updateUser()
    // call after — Supabase REST has no transaction across two requests, so
    // a failure in between used to leave a user row with no password_hash:
    // permanently locked out, since a retry of signup would hit the
    // "account exists" check above and never reach the password field again.
    let newUser;
    try {
      newUser = await db.createUser(email.toLowerCase(), name || 'Guest', { passwordHash, phone, currency, country });
    } catch (e) {
      console.error('[Signup] Insert failed:', e.message);
      return res.status(500).json({
        error: lang === 'en'
          ? 'Something went wrong creating your account. Please try again in a moment.'
          : 'Algo deu errado ao criar sua conta. Tente novamente em instantes.',
        code: 'SIGNUP_FAILED',
      });
    }

    if (!newUser) {
      return res.status(500).json({
        error: lang === 'en'
          ? 'Something went wrong creating your account. Please try again in a moment.'
          : 'Algo deu errado ao criar sua conta. Tente novamente em instantes.',
        code: 'SIGNUP_FAILED',
      });
    }

    const token = generateToken();
    await db.createSession(email.toLowerCase(), token);

    const user = await db.getUser(email);

    // Fire-and-forget emails
    sendWelcomeEmail(email, name || 'Guest', user || {}).catch(() => {});
    sendAdminNotification('New User Signup', `<p><strong>${name || 'Guest'}</strong> (${email}) just signed up.</p>`).catch(() => {});

    res.json({ user: { ...user, isAdmin: isAdminEmail(user?.email) }, token });
  });

  router.post('/auth/logout', authMiddleware, async (req, res) => {
    const token = req.headers.authorization.slice(7);
    // deleteSession used to swallow its own failures, so a logout that never
    // reached the database still reported success and the token stayed live.
    const revoked = await db.deleteSession(token);
    if (!revoked) {
      console.error(`[Auth] logout did not confirm revocation for ${req.userEmail}`);
      return res.status(500).json({
        error: 'Could not fully sign out. Please try again.',
        code: 'LOGOUT_INCOMPLETE',
      });
    }
    res.json({ success: true });
  });

  router.get('/auth/me', authMiddleware, async (req, res) => {
    res.json({ ...req.user, isAdmin: isAdminEmail(req.userEmail) });
  });

  router.post('/auth/forgot-password', resetRateLimit, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatorio' });

    const user = await db.getUser(email);
    if (!user) {
      // Security: Don't reveal if user exists — same response either way
      return res.json({ success: true });
    }

    const token = generateToken();
    await db.createPasswordReset(email.toLowerCase(), token);
    // Security: Token is NOT logged — only sent via email

    // Fire-and-forget password reset email
    const resetUrl = `https://resdrop.app/reset-password?token=${token}`;
    // Swallowed on purpose — the response must not reveal whether the account
    // exists — but a user who never gets the mail deserves a trace in the logs.
    sendPasswordReset(email, user.name, resetUrl, user)
      .catch((e) => console.error(`[Auth] forgot-password: reset email failed to send: ${e.message}`));

    res.json({ success: true });
  });

  router.post('/auth/reset-password', resetSubmitLimit, async (req, res) => {
    const { token, password, lang } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token e senha obrigatorios' });
    }
    const pwCheck = validatePassword(password);
    if (!pwCheck.ok) {
      return res.status(400).json({ error: messageFor(pwCheck, lang), code: pwCheck.code });
    }

    const reset = await db.getPasswordReset(token);
    if (!reset) {
      return res.status(400).json({ error: 'Token invalido ou expirado' });
    }

    const hash = await hashPassword(password);

    // These three writes have no transaction around them, so the order decides
    // how a partial failure lands. Burning the token first fails CLOSED: the
    // account is untouched and the same link still works, so the user just
    // tries again. The old order (password first) failed open — it could leave
    // a changed password behind a link that stayed usable for the rest of its
    // hour.
    const burned = await db.markPasswordResetUsed(token);
    if (!burned) {
      console.error(`[Auth] reset-password: could not consume token for ${reset.user_email} — password left unchanged`);
      return res.status(500).json({ error: 'Nao foi possivel concluir agora. Tente novamente.' });
    }

    await db.updateUser(reset.user_email, { passwordHash: hash });

    // updateUser falls back to a plain read when the authoritative write fails,
    // so a truthy return is not proof that the new password landed — and
    // reporting success on a password that never changed is how an account
    // becomes unreachable. Read it back through the one accessor that keeps the
    // hash and compare. The link is already spent at this point, hence the
    // "ask for a new one" wording.
    const stored = await db.getUserWithPassword(reset.user_email);
    if (stored?.passwordHash !== hash) {
      console.error(`[Auth] reset-password: password write did not land for ${reset.user_email}`);
      return res.status(500).json({
        error: 'Nao foi possivel alterar a senha. Solicite um novo link de redefinicao.',
        code: 'RESET_WRITE_FAILED',
      });
    }

    // The password is already changed, so a failure here must not be reported
    // as a failed reset: the user would retry with a spent token, be told it is
    // invalid, and never learn that the new password works. Surviving sessions
    // are logged instead.
    const revoked = await db.deleteUserSessions(reset.user_email).catch((e) => {
      console.error(`[Auth] reset-password: session revocation threw for ${reset.user_email}: ${e.message}`);
      return false;
    });
    if (!revoked) {
      console.error(`[Auth] reset-password: sessions may still be live for ${reset.user_email} after a password change`);
    }

    res.json({ success: true });
  });

  router.post('/auth/onboarding', authMiddleware, async (req, res) => {
    const { travelerType, preferredEmail, currency, alertsEnabled } = req.body;

    const updates = {
      onboardingCompleted: true,
      travelerType: travelerType || null,
      preferredEmail: preferredEmail || req.userEmail,
      currency: currency || 'BRL',
      alertsEnabled: alertsEnabled !== false,
    };

    const updated = await db.updateUser(req.userEmail, updates);
    if (!updated) return res.status(500).json({ error: 'Failed to save onboarding' });
    delete updated.passwordHash;
    res.json(updated);
  });

  // ─── CURRENCIES ─────────────────────────────────────────────
  const CURRENCIES = [
    { code: 'BRL', label: 'R$', name: 'Real Brasileiro' },
    { code: 'USD', label: '$', name: 'US Dollar' },
    { code: 'EUR', label: '\u20ac', name: 'Euro' },
    { code: 'GBP', label: '\u00a3', name: 'British Pound' },
    { code: 'CAD', label: 'CA$', name: 'Canadian Dollar' },
    { code: 'AED', label: '\u062f.\u0625', name: 'UAE Dirham' },
    { code: 'INR', label: '\u20b9', name: 'Indian Rupee' },
    { code: 'JPY', label: '\u00a5', name: 'Japanese Yen' },
    { code: 'CNY', label: '\u00a5', name: 'Chinese Yuan' },
    { code: 'AUD', label: 'A$', name: 'Australian Dollar' },
    { code: 'CHF', label: 'CHF', name: 'Swiss Franc' },
    { code: 'SGD', label: 'S$', name: 'Singapore Dollar' },
  ];

  router.get('/currencies', (req, res) => {
    res.json(CURRENCIES);
  });

  // ─── PROFILE ─────────────────────────────────────────────────
  router.put('/profile', authMiddleware, async (req, res) => {
    const { name, phone, dateOfBirth, preferredRoomType, loyaltyPrograms } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
    if (preferredRoomType !== undefined) updates.preferredRoomType = preferredRoomType;
    if (loyaltyPrograms !== undefined) updates.loyaltyPrograms = loyaltyPrograms;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updated = await db.updateUser(req.userEmail, updates);
    if (!updated) return res.status(500).json({ error: 'Failed to update profile' });
    delete updated.passwordHash;
    res.json(updated);
  });

  router.get('/users/:email', authMiddleware, async (req, res) => {
    if (req.params.email.toLowerCase() !== req.userEmail) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await db.updateUserStats(req.userEmail);
    const user = await db.getUser(req.userEmail);
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
    const plan = PLANS[user.plan] || PLANS.free;
    res.json({ ...user, planLimit: plan.bookingsPerMonth, planPrice: plan.price });
  });



  return router;
}
