import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { listQuestions, myKits, submitQuiz } from "./quiz.controller.js";

export const quizRouter = Router();

quizRouter.get("/", asyncHandler(listQuestions));
quizRouter.post("/submit", requireAuth, asyncHandler(submitQuiz));
quizRouter.get("/kits", requireAuth, asyncHandler(myKits));
