import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import membershipsRouter from "./memberships";
import propertyListingsRouter from "./property-listings";
import landRouter from "./land";
import constructionRouter from "./construction";
import mobilityRouter from "./mobility";
import marketplaceRouter from "./marketplace";
import youthRouter from "./youth";
import prospectingRouter from "./prospecting";
import treasuryRouter from "./treasury";
import riskRouter from "./risk";
import settlementRouter from "./settlement";
import internalRouter from "./internal";
import assetsRouter from "./assets";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(membershipsRouter);
router.use(propertyListingsRouter);
router.use(landRouter);
router.use(constructionRouter);
router.use(mobilityRouter);
router.use(marketplaceRouter);
router.use(youthRouter);
router.use(prospectingRouter);
router.use(treasuryRouter);
router.use(riskRouter);
router.use(settlementRouter);
router.use(internalRouter);
router.use(assetsRouter);
router.use(dashboardRouter);

export default router;
