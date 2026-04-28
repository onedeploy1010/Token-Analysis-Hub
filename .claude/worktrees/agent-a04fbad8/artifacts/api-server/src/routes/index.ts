import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import toolsRouter from "./tools";
import runeRouter from "./rune";
import hyperliquidRouter from "./hyperliquid";
import resourcesRouter from "./resources";
import storageRouter from "./storage";
import adminAuthRouter from "./admin-auth";
import adminUploadRouter from "./admin-upload";
import adminResourcesRouter from "./admin-resources";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(toolsRouter);
router.use(runeRouter);
router.use(hyperliquidRouter);
router.use(resourcesRouter);
router.use(storageRouter);
router.use(adminAuthRouter);
router.use(adminUploadRouter);
router.use(adminResourcesRouter);

export default router;
