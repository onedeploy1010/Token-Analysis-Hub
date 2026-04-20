import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import toolsRouter from "./tools";
import runeRouter from "./rune";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(toolsRouter);
router.use(runeRouter);

export default router;
