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
  buyProduct
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
    console.log(response)
    return res.status(response.status).send(response);
  } catch (error) {
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