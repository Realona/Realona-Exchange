import app from "./app";
import { logger } from "./lib/logger";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./lib/auth";

async function ensureSuperAdmin() {
  try {
    const email = "realonabusinessexchange@gmail.com";
    const passwordHash = await hashPassword("Kolade1642@#");
    await db
      .update(usersTable)
      .set({ isAdmin: true, isSuperAdmin: true, passwordHash, username: "Kolgb1642" })
      .where(eq(usersTable.email, email));
    logger.info("Super admin account verified");
  } catch (err) {
    logger.error({ err }, "Failed to verify super admin account");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

ensureSuperAdmin().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});
