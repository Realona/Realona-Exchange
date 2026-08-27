import { Router, type IRouter } from "express";
import { db, usersTable, pendingRegistrationsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { hashPassword, comparePassword, signToken, requireAuth } from "../lib/auth";
import { emailWelcome, emailOtp } from "../lib/email";
import { notifyAdmins } from "../lib/adminNotifier";
import { RegisterBody, LoginBody, VerifyEmailBody, ResendOtpBody } from "@workspace/api-zod";
import crypto from "crypto";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    walletBalance: Number(user.walletBalance),
    isAdmin: user.isAdmin,
    isSuperAdmin: user.isSuperAdmin,
    isSuspended: user.isSuspended,
    createdAt: user.createdAt,
  };
}

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, username, password } = parsed.data;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const [existingUsername] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));
  if (existingUsername) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  // Clean up any existing pending registration for this email
  await db
    .delete(pendingRegistrationsTable)
    .where(eq(pendingRegistrationsTable.email, email));

  const passwordHash = await hashPassword(password);
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const pendingToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.insert(pendingRegistrationsTable).values({
    token: pendingToken,
    email,
    username,
    passwordHash,
    otpHash,
    expiresAt,
  });

  try {
    await emailOtp({ email, username, otp });
  } catch (err: any) {
    console.error("[auth] emailOtp failed for", email, "—", err?.message);
  }

  res.status(200).json({
    pendingToken,
    message: `A 6-digit verification code has been sent to ${email}`,
  });
});

router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { pendingToken, otp } = parsed.data;

  const [pending] = await db
    .select()
    .from(pendingRegistrationsTable)
    .where(
      and(
        eq(pendingRegistrationsTable.token, pendingToken),
        gt(pendingRegistrationsTable.expiresAt, new Date())
      )
    );

  if (!pending) {
    res.status(400).json({ error: "Verification code expired or invalid. Please register again." });
    return;
  }

  const otpHash = hashOtp(otp);
  if (otpHash !== pending.otpHash) {
    res.status(400).json({ error: "Incorrect verification code" });
    return;
  }

  // Double-check email/username still available
  const [existingEmail] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, pending.email));
  if (existingEmail) {
    await db.delete(pendingRegistrationsTable).where(eq(pendingRegistrationsTable.id, pending.id));
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const [existingUsername] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, pending.username));
  if (existingUsername) {
    await db.delete(pendingRegistrationsTable).where(eq(pendingRegistrationsTable.id, pending.id));
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({ email: pending.email, username: pending.username, passwordHash: pending.passwordHash })
    .returning();

  await db.delete(pendingRegistrationsTable).where(eq(pendingRegistrationsTable.id, pending.id));

  const token = signToken({ userId: user.id });
  emailWelcome({ email: user.email, username: user.username }).catch(() => {});
  await notifyAdmins({
    title: "New user registration",
    message: `${user.username} has completed email verification and registered on Realona Exchange.`,
    linkUrl: "/admin/users",
    metadata: { userId: user.id, linkUrl: "/admin/users" },
  });
  res.status(201).json({ user: formatUser(user), token });
});

router.post("/auth/resend-otp", async (req, res): Promise<void> => {
  const parsed = ResendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { pendingToken } = parsed.data;

  const [pending] = await db
    .select()
    .from(pendingRegistrationsTable)
    .where(
      and(
        eq(pendingRegistrationsTable.token, pendingToken),
        gt(pendingRegistrationsTable.expiresAt, new Date())
      )
    );

  if (!pending) {
    res.status(400).json({ error: "Session expired. Please register again." });
    return;
  }

  // Generate fresh OTP and extend expiry
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db
    .update(pendingRegistrationsTable)
    .set({ otpHash, expiresAt })
    .where(eq(pendingRegistrationsTable.id, pending.id));

  try {
    await emailOtp({ email: pending.email, username: pending.username, otp });
  } catch (err: any) {
    console.error("[auth] resend emailOtp failed for", pending.email, "—", err?.message);
  }

  res.json({ success: true, message: "Verification code resent" });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (user.isSuspended) {
    res.status(403).json({ error: "Account suspended" });
    return;
  }

  const token = signToken({ userId: user.id });
  res.json({ user: formatUser(user), token });
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  res.json(formatUser(req.user!));
});

export default router;
