import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import notesRouter from "./notes";
import flashcardsRouter from "./flashcards";
import currentAffairsRouter from "./currentAffairs";
import trackerNotesRouter from "./trackerNotes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(notesRouter);
router.use(flashcardsRouter);
router.use(currentAffairsRouter);
router.use(trackerNotesRouter);

export default router;
