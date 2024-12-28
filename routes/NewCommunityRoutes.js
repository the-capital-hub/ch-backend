import express from "express";
import {
  createCommunityController,
  getCommunityByIdController,
  getAllCommunitiesByUserIdController,
  updateCommunityController,
  exitCommunityController,
  getUnAddedMembersController,
  addMembersToCommunityController,
  deleteCommunityController,
} from "../controllers/newCommunityController.js";

import { authenticateToken } from "../middlewares/authenticateToken.js";
const router = express.Router();

router.use(authenticateToken);

router.post("/createCommunity", createCommunityController);
router.get("/getCommunityById/:communityId", getCommunityByIdController);
router.get("/getAllCommunitiesByUserId/:userId", getAllCommunitiesByUserIdController);
router.patch("/updateCommunity/:communityId", updateCommunityController);
router.patch("/exitCommunity/:communityId/:userId", exitCommunityController);
router.get("/getUnAddedMembers/:communityId/:userId", getUnAddedMembersController);
router.patch("/addMembersToCommunity/:communityId", addMembersToCommunityController);
router.delete("/deleteCommunity/:communityId", deleteCommunityController);

export default router;