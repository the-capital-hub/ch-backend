import { cloudinary } from "../utils/uploadImage.js";
import { MessageModel } from "../models/Message.js";
import { UserModel } from "../models/User.js";
import community_schema from "../models/newCommunity.js";

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
    const communities = await community_schema.find({ adminId: userId })
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
    community.members = [...new Set([...community.members, ...memberIds])];
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
