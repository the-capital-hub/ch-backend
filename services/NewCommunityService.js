import { cloudinary } from "../utils/uploadImage.js";
import { MessageModel } from "../models/Message.js";
import { UserModel } from "../models/User.js";
import community_schema from "../models/newCommunity.js";
import moment from 'moment';

export const createCommunity = async (communitydata) => {
  try {

    const user = await UserModel.findById(communitydata.adminId);
    const isSubscribed = (user.isSubscribed);

if(isSubscribed){
    if (communitydata.image) {
      const { secure_url } = await cloudinary.uploader.upload(communitydata.image, {
        folder: `${process.env.CLOUDIANRY_FOLDER}/posts/images`,
        format: "webp",
        unique_filename: true,
      });
      communitydata.image = secure_url;
    }
    const newCommunity = new community_schema({
      ...communitydata,
    });
    await newCommunity.save();
    return {
      status: 200,
      message: "New Community Created",
      data: newCommunity,
    }
  }
  else {
    return {
      status: 400,
      message: "Subscription Required",
      data: null,
  }
}

  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "An error occurred while creating community.",
    };
  }
};

export const getCommunityById = async (communityId) => {
  try {
    const community = await community_schema.findById(communityId)
      .populate({
        path: 'members.member',  
        populate: [
          { path: 'startUp' },   
          { path: 'investor' }   
        ]
      })
      .populate({
        path: 'adminId',
        populate: [
          { path: 'startUp' },
          { path: 'investor' }
        ]
      });

    if (!community) {
      return {
        status: 202,
        message: 'Community not found',
      };
    }

    return {
      status: 200,
      message: 'Community retrieved successfully',
      data: community,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: 'An error occurred while retrieving the community.',
    };
  }
};

export const getCommunityByname = async (communityName) => {
  try {
    const community = await community_schema.findOne({ name: communityName });
    if (community.length === 0) {
      return {
        status: 202,
        message: 'Community not found',
      };
    }

    return {
      status: 200,
      message: 'Community retrieved successfully',
      data: community,
    };
  } catch (error) {
    return {
      status: 500,
      message: 'An error occurred while retrieving the community.',
    };
  }
};

export const getAllCommunitiesByUserId = async (userId) => {
  try {
    const communities = await community_schema.find({
      $or: [
        { adminId: userId },
        { 'members.member': userId }
      ]
    })
      .populate({
        path: "members.member",
        model: "Users",
        select: "firstName lastName profilePicture oneLinkId",
      })
      .lean();

    // Add isOwner flag to each community
    const communitiesWithRole = communities.map(community => ({
      ...community,
      role: community.adminId.toString() === userId ? 'owner' : 'member'
    }));

    return {
      status: 200,
      message: 'Communities retrieved successfully',
      data: communitiesWithRole,
    };

  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: 'An error occurred while retrieving communities.',
    };
  }
};

export const getAllCommunities = async () => {
  try {
    const communities = await community_schema.find()
      .populate({
        path: "members",
        model: "Users",
        select: "firstName lastName profilePicture oneLinkId",
      })
      .lean();
    return {
      status: 200,
      message: 'Communities retrieved successfully',
      data: communities,
    };

  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: 'An error occurred while retrieving communities.',
    };
  }
};

export const updateCommunity = async (communityId, updatedData) => {
  try {
    const community = await community_schema.findById(communityId);

    if (!community) {
      return {
        status: 404,
        message: 'Community not found',
      };
    }
    if (updatedData.image) {
      const { secure_url } = await cloudinary.uploader.upload(updatedData.image, {
        folder: `${process.env.CLOUDIANRY_FOLDER}/posts/images`,
        format: 'webp',
        unique_filename: true,
      });
      community.image = secure_url;
    }

    community.name = updatedData.name || community.name;
    community.size = updatedData.size || community.size;
    community.subscription = updatedData.subscription || community.subscription;
    community.members = updatedData.members || community.members;
    community.amount = updatedData.amount || community.amount;
    community.isOpen = updatedData.isOpen || community.isOpen;
    community.about = updatedData.about || community.about;
    community.terms_and_conditions = updatedData.terms_and_conditions || community.terms_and_conditions;

    await community.save();
    console.log(community);

    return {
      status: 200,
      message: 'Community updated successfully',
      data: community,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: 'An error occurred while updating the community',
    };
  }
};

export const exitCommunity = async (userId, communityId) => {
  try {
    const community = await community_schema.findById(communityId);

    if (!community) {
      return {
        status: 404,
        message: "Community not found",
      };
    }
    const isMember = community.members.includes(userId);

    if (!isMember) {
      return {
        status: 400,
        message: "User is not a member of the community",
      };
    }
    community.members = community.members.filter((memberId) => memberId.toString() !== userId);
    await community.save();

    return {
      status: 200,
      message: "User has exited the community",
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: "An error occurred while exiting the community",
    };
  }
};

export const getUnAddedMembers = async (userId, communityId) => {
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return {
        status: 404,
        message: "User not found",
      };
    }
    const community = await community_schema.findById(communityId);
    if (!community) {
      return {
        status: 404,
        message: "Community not found",
      };
    }
    const userConnections = user.connections;
    const unAddedMembers = userConnections.filter(
      (connectionId) => !community.members.includes(connectionId)
    );
    const unAddedMembersInfo = await UserModel.find({
      _id: { $in: unAddedMembers },
    }).select("firstName lastName profilePicture oneLinkId");

    return {
      status: 200,
      message: "Unadded members retrieved successfully",
      data: unAddedMembersInfo,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: "An error occurred while retrieving unadded members",
      data: [],
    };
  }
};

export const addMembersToCommunity = async (communityId, memberIds) => {
  try {
    const community = await community_schema.findById(communityId);
    
    if (!community) {
      return {
        status: 404,
        message: "Community not found",
      };
    }

    // Check if the community subscription is 'free'
    if (community.subscription !== 'free') {
      return {
        status: 400,
        message: "Members cannot be added to a paid community",
      };
    }

    // Prepare the new members to add to the members array
    const newMembers = memberIds.map(memberId => ({
      member: memberId,
      joined_date: moment().toISOString(), // Set the current date as the joined_date
    }));

    // Add new members to the existing members array, ensuring no duplicates
    community.members = [
      ...community.members,
      ...newMembers
    ];

    community.members = Array.from(
      new Map(community.members.map(item => [item.member.toString(), item])).values()
    );

    // Save the community document after modifying the members array
    await community.save();

    return {
      status: 200,
      message: "Members added to the community successfully",
      data: community,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: "An error occurred while adding members to the community",
    };
  }
};

export const deleteCommunity = async (communityId, userId) => {
  try {
    const community = await community_schema.findOneAndDelete({ _id: communityId, adminId: userId });
    if (!community) {
      return {
        status: 403,
        message: 'You are not authorized to delete this community',
      };
    }
    return {
      status: 200,
      message: 'Community deleted successfully',
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: 'An error occurred while deleting the community',
    };
  }
};

export const addProductToCommunity = async (communityId, productData) => {
  try {
    

    if (productData.image) {
      const { secure_url } = await cloudinary.uploader.upload(productData.image, {
        folder: `${process.env.CLOUDINARY_FOLDER}/posts/images`,
        format: "webp",
        unique_filename: true,
      });
      productData.image = secure_url; 
    }

    
    const community = await community_schema.findById(communityId);

    if (!community) {
      throw new Error("Community not found");
    }

    
    community.products.push(productData);

    
    await community.save();

    return community; 
  } catch (error) {
    throw error; 
  }
};

export const buyProduct = async (userId, productId, communityId) => {
  try {
    const community = await community_schema.findById(communityId);
    
    if (!community) {
      return {
        status: 404,
        message: "Community not found"
      };
    }

    const product = community.products.id(productId);
    
    if (!product) {
      return {
        status: 404,
        message: "Product not found"
      };
    }

    if (!product.is_free) {
      return {
        status: 400,
        message: "This product is not free"
      };
    }

    if (product.purchased_by.includes(userId)) {
      return {
        status: 400,
        message: "You have already purchased this product"
      };
    }

    product.purchased_by.push(userId);
    await community.save();

    return {
      status: 200,
      message: "Product purchased successfully",
      data: product
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: "An error occurred while purchasing the product"
    };
  }
};
