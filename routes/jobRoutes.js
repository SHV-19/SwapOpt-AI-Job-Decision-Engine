import express from "express";

import {
  analyzeJobController,
  tailorController,
  resumeDraftController,
  applicationHelpController,
  coverLetterController,
  networkController
} from "../controllers/jobController.js";

import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.post(
  "/analyze",
  asyncHandler(analyzeJobController)
);

router.post(
  "/tailor",
  asyncHandler(tailorController)
);

router.post(
  "/resume-draft",
  asyncHandler(resumeDraftController)
);

router.post(
  "/application-help",
  asyncHandler(applicationHelpController)
);

router.post(
  "/cover-letter",
  asyncHandler(coverLetterController)
);

router.post(
  "/network",
  asyncHandler(networkController)
);

export default router;