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
  buyProductController,
  createPaymentSessionController,
  verifyPaymentController,
  softDeleteCommunityController,
  removeMemberController,
  leaveCommunityController,
  sendJoinRequestController
} from "../controllers/newCommunityController.js";

import { authenticateToken } from "../middlewares/authenticateToken.js";
import { getCommunityByname } from "../services/NewCommunityService.js";
const router = express.Router();

router.get("/getCommunityById/:communityId", getCommunityByIdController);
router.use(authenticateToken);
router.post("/createCommunity", createCommunityController);
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
router.post("/create-payment-session", createPaymentSessionController);
router.post("/verify-payment", verifyPaymentController);
router.delete('/softDelete/:communityId', authenticateToken, softDeleteCommunityController);
router.patch('/removeMember/:communityId/:memberId', authenticateToken, removeMemberController);
router.post('/leaveCommunity/:communityId', authenticateToken, leaveCommunityController);
router.post("/sendJoinRequest", sendJoinRequestController);

export default router;