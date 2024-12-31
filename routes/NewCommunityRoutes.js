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
  getCommunityByNameController,
  getAllCommunitiesController,
  addProductController,
  buyProductController
} from "../controllers/newCommunityController.js";

import { authenticateToken } from "../middlewares/authenticateToken.js";
import { getCommunityByname } from "../services/NewCommunityService.js";
const router = express.Router();

router.use(authenticateToken);
router.post("/createCommunity", createCommunityController);
router.get("/getCommunityById/:communityId", getCommunityByIdController);
router.get("/getCommunityByName/:communityName", getCommunityByNameController);
router.get("/getAllCommunities", getAllCommunitiesController);
router.get("/getAllCommunitiesByUserId", getAllCommunitiesByUserIdController);
router.patch("/updateCommunity/:communityId", updateCommunityController);
router.patch("/exitCommunity/:communityId/:userId", exitCommunityController);
router.get("/getUnAddedMembers/:communityId/:userId", getUnAddedMembersController);
router.post("/addMembersToCommunity/:communityId", addMembersToCommunityController);
router.post("/addProductToCommunity/:communityId", addProductController)
router.delete("/deleteCommunity/:communityId", deleteCommunityController);
router.post("/buyProduct/:communityId/:productId", buyProductController);

export default router;