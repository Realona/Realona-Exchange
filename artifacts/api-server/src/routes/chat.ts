import { Router, type IRouter } from "express";
import { db, adminMessagesTable, listingsTable, tradeMessagesTable, tradesTable, usersTable } from "@workspace/db";
import { and, eq, ilike, ne, or, sql } from "drizzle-orm";
import { requireAdmin, requireAuth } from "../lib/auth";
import {
  GetAdminChatMessagesParams,
  GetAdminChatUsersQueryParams,
  GetTradeMessagesParams,
  MarkAdminChatReadParams,
  SendAdminChatMessageBody,
  SendAdminChatMessageParams,
  SendAdminReplyBody,
  SendTradeMessageParams,
  SendTradeMessageBody,
} from "@workspace/api-zod";
import { createNotification } from "../lib/notifier";
import { notifyAdmins } from "../lib/adminNotifier";

const router: IRouter = Router();

const MAX_ADMIN_MESSAGE_LENGTH = 2000;

function formatAdminMessage(
  message: typeof adminMessagesTable.$inferSelect,
  sender?: { username: string; isAdmin: boolean } | null,
  listingName?: string | null,
) {
  return {
    id: message.id,
    userId: message.userId,
    senderId: message.senderId,
    senderUsername: sender?.username ?? "Unknown",
    senderIsAdmin: sender?.isAdmin ?? false,
    listingId: message.listingId ?? null,
    listingName: listingName ?? null,
    message: message.message,
    isRead: message.isRead,
    createdAt: message.createdAt,
  };
}

async function getAdminConversation(userId: number) {
  const rows = await db
    .select({
      message: adminMessagesTable,
      senderUsername: usersTable.username,
      senderIsAdmin: sql<boolean>`(${usersTable.isAdmin} OR ${usersTable.isSuperAdmin})`,
      listingName: listingsTable.gameName,
    })
    .from(adminMessagesTable)
    .leftJoin(usersTable, eq(adminMessagesTable.senderId, usersTable.id))
    .leftJoin(listingsTable, eq(adminMessagesTable.listingId, listingsTable.id))
    .where(eq(adminMessagesTable.userId, userId))
    .orderBy(adminMessagesTable.createdAt);

  return rows.map((row) => formatAdminMessage(
    row.message,
    row.senderUsername ? { username: row.senderUsername, isAdmin: Boolean(row.senderIsAdmin) } : null,
    row.listingName,
  ));
}

router.get("/trades/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const params = GetTradeMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid trade ID" });
    return;
  }

  // Verify user is part of the trade or admin
  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, params.data.id));
  if (!trade) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }

  if (trade.buyerId !== req.userId && trade.sellerId !== req.userId && !req.user?.isAdmin && !req.user?.isSuperAdmin) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const rows = await db
    .select({
      message: tradeMessagesTable,
      senderUsername: usersTable.username,
    })
    .from(tradeMessagesTable)
    .leftJoin(usersTable, eq(tradeMessagesTable.senderId, usersTable.id))
    .where(eq(tradeMessagesTable.tradeId, params.data.id))
    .orderBy(tradeMessagesTable.createdAt);

  res.json(rows.map(r => ({
    id: r.message.id,
    tradeId: r.message.tradeId,
    senderId: r.message.senderId,
    senderUsername: r.senderUsername ?? (r.message.isSystem ? "System" : "Unknown"),
    message: r.message.message,
    isSystem: r.message.isSystem,
    createdAt: r.message.createdAt,
  })));
});

router.post("/trades/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const params = SendTradeMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid trade ID" });
    return;
  }

  const parsed = SendTradeMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, params.data.id));
  if (!trade) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }

  if (trade.buyerId !== req.userId && trade.sellerId !== req.userId && !req.user?.isAdmin && !req.user?.isSuperAdmin) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const [msg] = await db.insert(tradeMessagesTable).values({
    tradeId: params.data.id,
    senderId: req.userId!,
    message: parsed.data.message,
    isSystem: false,
  }).returning();

  const [sender] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, req.userId!));

  res.status(201).json({
    id: msg.id,
    tradeId: msg.tradeId,
    senderId: msg.senderId,
    senderUsername: sender?.username ?? null,
    message: msg.message,
    isSystem: msg.isSystem,
    createdAt: msg.createdAt,
  });
});

// Private admin-to-user conversations. These are intentionally separate from
// trade chat so an admin can contact a user before a trade exists.
router.get("/admin/chat/users", requireAdmin, async (req, res): Promise<void> => {
  const parsed = GetAdminChatUsersQueryParams.safeParse(req.query);
  const search = parsed.success ? parsed.data.search?.trim() : undefined;
  const conditions = [
    eq(usersTable.isAdmin, false),
    eq(usersTable.isSuperAdmin, false),
  ];
  if (search) {
    conditions.push(or(
      ilike(usersTable.username, `%${search}%`),
      ilike(usersTable.email, `%${search}%`),
    )!);
  }

  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      lastMessage: sql<string | null>`(
        SELECT am.message
        FROM admin_messages am
        WHERE am.user_id = ${usersTable.id}
        ORDER BY am.created_at DESC
        LIMIT 1
      )`,
      lastMessageAt: sql<Date | null>`(
        SELECT am.created_at
        FROM admin_messages am
        WHERE am.user_id = ${usersTable.id}
        ORDER BY am.created_at DESC
        LIMIT 1
      )`,
      unreadCount: sql<number>`(
        SELECT count(*)::int
        FROM admin_messages am
        WHERE am.user_id = ${usersTable.id}
          AND am.sender_id = ${usersTable.id}
          AND am.is_read = false
      )`,
    })
    .from(usersTable)
    .where(and(...conditions))
    .orderBy(usersTable.username);

  res.json(users.map((user) => ({ ...user, unreadCount: Number(user.unreadCount) })));
});

router.get("/admin/chat/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = GetAdminChatMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const [user] = await db
    .select({ id: usersTable.id, isAdmin: usersTable.isAdmin, isSuperAdmin: usersTable.isSuperAdmin })
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id));
  if (!user || user.isAdmin || user.isSuperAdmin) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(await getAdminConversation(user.id));
});

router.post("/admin/chat/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = SendAdminChatMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const parsed = SendAdminChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const messageText = parsed.data.message.trim();
  if (!messageText || messageText.length > MAX_ADMIN_MESSAGE_LENGTH) {
    res.status(400).json({ error: `Message must be between 1 and ${MAX_ADMIN_MESSAGE_LENGTH} characters` });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id, username: usersTable.username, isAdmin: usersTable.isAdmin, isSuperAdmin: usersTable.isSuperAdmin })
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id));
  if (!user || user.isAdmin || user.isSuperAdmin) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let listingName: string | null = null;
  if (parsed.data.listingId != null) {
    const [listing] = await db
      .select({ id: listingsTable.id, gameName: listingsTable.gameName })
      .from(listingsTable)
      .where(eq(listingsTable.id, parsed.data.listingId));
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    listingName = listing.gameName;
  }

  const [created] = await db.insert(adminMessagesTable).values({
    userId: user.id,
    senderId: req.userId!,
    listingId: parsed.data.listingId ?? null,
    message: messageText,
    isRead: false,
  }).returning();
  const [sender] = await db
    .select({
      username: usersTable.username,
      isAdmin: sql<boolean>`(${usersTable.isAdmin} OR ${usersTable.isSuperAdmin})`,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  await createNotification(
    user.id,
    "admin_message",
    "Message from Realona Admin",
    `You have a new message from ${sender?.username ?? "an admin"}${listingName ? ` about ${listingName}` : ""}.`,
    { linkUrl: "/messages", listingId: created.listingId },
  );

  res.status(201).json(formatAdminMessage(
    created,
    sender ? { username: sender.username, isAdmin: Boolean(sender.isAdmin) } : null,
    listingName,
  ));
});

router.post("/admin/chat/users/:id/read", requireAdmin, async (req, res): Promise<void> => {
  const params = MarkAdminChatReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  await db.update(adminMessagesTable)
    .set({ isRead: true })
    .where(and(
      eq(adminMessagesTable.userId, params.data.id),
      eq(adminMessagesTable.isRead, false),
      eq(adminMessagesTable.senderId, params.data.id),
    ));
  res.json({ success: true });
});

router.get("/messages", requireAuth, async (req, res): Promise<void> => {
  res.json(await getAdminConversation(req.userId!));
});

router.post("/messages", requireAuth, async (req, res): Promise<void> => {
  const parsed = SendAdminReplyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const messageText = parsed.data.message.trim();
  if (!messageText || messageText.length > MAX_ADMIN_MESSAGE_LENGTH) {
    res.status(400).json({ error: `Message must be between 1 and ${MAX_ADMIN_MESSAGE_LENGTH} characters` });
    return;
  }

  const [created] = await db.insert(adminMessagesTable).values({
    userId: req.userId!,
    senderId: req.userId!,
    message: messageText,
    isRead: false,
  }).returning();
  const [sender] = await db
    .select({ username: usersTable.username, isAdmin: usersTable.isAdmin })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  await notifyAdmins({
    title: "New message from user",
    message: `${sender?.username ?? "A user"} sent a private support message. Open the conversation to read it.`,
    linkUrl: `/admin/chat?userId=${req.userId!}`,
    metadata: { userId: req.userId!, linkUrl: `/admin/chat?userId=${req.userId!}` },
  });

  res.status(201).json(formatAdminMessage(
    created,
    sender ? { username: sender.username, isAdmin: Boolean(sender.isAdmin) } : null,
  ));
});

router.post("/messages/read", requireAuth, async (req, res): Promise<void> => {
  await db.update(adminMessagesTable)
    .set({ isRead: true })
    .where(and(
      eq(adminMessagesTable.userId, req.userId!),
      eq(adminMessagesTable.isRead, false),
      ne(adminMessagesTable.senderId, req.userId!),
    ));
  res.json({ success: true });
});

export default router;
