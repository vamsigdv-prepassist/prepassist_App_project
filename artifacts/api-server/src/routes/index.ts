import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import notesRouter from "./notes";
import flashcardsRouter from "./flashcards";
import currentAffairsRouter from "./currentAffairs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(notesRouter);
router.use(flashcardsRouter);
router.use(currentAffairsRouter);

export default router;
