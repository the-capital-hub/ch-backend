import {
  createCommunity,
  getCommunityById,
  getAllCommunitiesByUserId,
  updateCommunity,
  exitCommunity,
  getUnAddedMembers,
  addMembersToCommunity,
  deleteCommunity,
  getCommunityByname,
  getAllCommunities,
  addProductToCommunity,
  buyProduct,
  createPaymentSession,
  verifyPayment,
  removeMember,
  leaveCommunity,
  softDeleteCommunity,
  sendJoinRequestEmail
} from "../services/NewCommunityService.js";

export const createCommunityController = async (req, res) => {
  try {
    const response = await createCommunity(req.body);
    return res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while creating communities.",
    });
  }
};

export const getCommunityByIdController = async (req, res) => {
  try {
    const { communityId } = req.params;
    const response = await getCommunityById(communityId);
    return res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while getting community.",
    });
  }
};

export const getAllCommunitiesController = async (req, res) => {
  try {
    const response = await getAllCommunities();
    return res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while getting community.",
    });
  }
};

export const getCommunityByNameController = async (req, res) => {
  try {
    const { communityName } = req.params;
    const response = await getCommunityByname(communityName);
    return res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while getting community.",
    });
  }
};


export const getAllCommunitiesByUserIdController = async (req, res) => {
  try {
    const userId = req.userId;
    const response = await getAllCommunitiesByUserId(userId);
    return res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while getting community.",
    });
  }
};

export const updateCommunityController = async (req, res) => {
  try {
    const { communityId } = req.params;
    const updatedData = req.body;
    const response = await updateCommunity(communityId, updatedData);
    return res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while updating the community.",
    });
  }
};


export const exitCommunityController = async (req, res) => {
  try {
    const { communityId, userId } = req.params;
    const response = await exitCommunity(userId, communityId);
    return res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while exiting the community.",
    });
  }
};

export const getUnAddedMembersController = async (req, res) => {
  try {
    const { communityId, userId } = req.params;
    const response = await getUnAddedMembers(userId, communityId);
    return res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while exiting the community.",
    });
  }
};

export const addMembersToCommunityController = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { memberIds } = req.body;
    const response = await addMembersToCommunity(communityId, memberIds);
    return res.status(response.status).send(response);
  } catch (error) {
    console.log(error)
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while adding members to the community.",
    });
  }
};

export const deleteCommunityController = async (req, res) => {
  try {
    const userId = req.userId;
    const { communityId } = req.params;
    const response = await deleteCommunity(communityId, userId);
    return res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while deleting the community.",
    });
  }
};

export const addProductController = async (req, res) => {
  const { communityId } = req.params; 
  const { name, description, is_free, image, URLS, amount } = req.body; 

  try {
    
    const productData = {
      name,
      description,
      is_free,
      image,
      URLS,
      amount
    };
    const updatedCommunity = await addProductToCommunity(communityId, productData);
    return res.status(200).json({
      message: "Product added successfully",
      data: updatedCommunity,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || "An error occurred while adding the product" });
  }
};

export const buyProductController = async (req, res) => {
  try {
    const userId = req.userId;
    const { productId, communityId } = req.params;
    const response = await buyProduct(userId, productId, communityId);
    return res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while purchasing the product.",
    });
  }
};

export const createPaymentSessionController = async (req, res) => {
  try {
    const response = await createPaymentSession(req.body);
    return res.status(response.status).send(response);
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      status: 500,
      message: error.message,
    });
  }
};

export const verifyPaymentController = async (req, res) => {
  try {
    const { orderId, entityId, entityType } = req.body;
    const userData = { userId: req.userId };
    const response = await verifyPayment(orderId, entityId, entityType, userData);
    return res.status(response.status).send(response);
  } catch (error) {
    console.log(error);
    
    return res.status(500).send({
      status: 500,
      message: error.message,
    });
  }
};

export const removeMemberController = async (req, res) => {
  try {
    const { communityId, memberId } = req.params;
    const adminId = req.userId; // Assuming the admin is authenticated and their ID is in req.userId
    const { reason } = req.body; // Get the reason from the request body

    const response = await removeMember(communityId, adminId, memberId, reason);
    return res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while removing the member.",
    });
  }
};

export const leaveCommunityController = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.userId; // Get the user ID from the authenticated request
    const { reason } = req.body; // Get the reason from the request body

    const response = await leaveCommunity(communityId, userId, reason);
    return res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while leaving the community.",
    });
  }
};

export const softDeleteCommunityController = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { reason } = req.body; // Get the reason from the request body
    const userId = req.userId; // Get the user ID from the authenticated request

    const response = await softDeleteCommunity(communityId, userId, reason);
    return res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while deleting the community.",
    });
  }
};

export const sendJoinRequestController = async (req, res) => {
  try {
    const response = await sendJoinRequestEmail(req.body);
    return res.status(200).send({
      status: 200,
      message: "Join request sent successfully.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while sending the join request.",
    });
  }
};