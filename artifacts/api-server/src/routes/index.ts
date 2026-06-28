import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import listingsRouter from "./listings";
import tradesRouter from "./trades";
import chatRouter from "./chat";
import depositsRouter from "./deposits";
import withdrawalsRouter from "./withdrawals";
import reportsRouter from "./reports";
import adminRouter from "./admin";
import webhooksRouter from "./webhooks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(listingsRouter);
router.use(tradesRouter);
router.use(chatRouter);
router.use(depositsRouter);
router.use(withdrawalsRouter);
router.use(reportsRouter);
router.use(adminRouter);
router.use(webhooksRouter);

export default router;
