import { cloudinary } from "../utils/uploadImage.js";
import { MessageModel } from "../models/Message.js";
import { UserModel } from "../models/User.js";
import community_schema from "../models/newCommunity.js";
import moment from 'moment';
import { Cashfree } from "cashfree-pg";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import ejs from "ejs";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
	service: "gmail",
	secure: false,
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
});

async function sendCommunityDeletionEmail(email, data) {
  try {
    const emailContent = await ejs.renderFile("./public/communityDeletionEmail.ejs", {
      memberName: data.memberName,
      communityName: data.communityName,
      adminName: data.adminName,
      reason: data.reason
    });

    await transporter.sendMail({
      from: `"The Capital Hub" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Community Deleted",
      html: emailContent,
    });
  } catch (error) {
    console.error("Error sending community deletion email:", error);
  }
}

async function sendMemberRemovalEmail(email, data) {
  try {
    const emailContent = await ejs.renderFile("./public/memberRemoval.ejs", {
      memberName: data.memberName,
      communityName: data.communityName,
      adminName: data.adminName,
      reason: data.reason
    });

    await transporter.sendMail({
      from: `"The Capital Hub" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Removed from Community",
      html: emailContent,
    });
  } catch (error) {
    console.error("Error sending member removal email:", error);
  }
}

async function sendMemberLeaveEmail(email, data) {
  try {
    const emailContent = await ejs.renderFile("./public/memberLeaveEmail.ejs", {
      memberName: data.memberName,
      communityName: data.communityName,
      reason: data.reason
    });

    await transporter.sendMail({
      from: `"The Capital Hub" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Member Left Community",
      html: emailContent,
    });
  } catch (error) {
    console.error("Error sending member leave email:", error);
  }
}

async function sendPurchaseEmail(email, data, isSuccess = true) {
  try {
    const template = isSuccess ? './public/purchaseSuccess.ejs' : './public/purchaseFailed.ejs';
    const emailContent = await ejs.renderFile(template, {
      userName: data.userName,
      communityName: data.communityName,
      productName: data.productName,
      productPrice: data.productPrice,
      purchaseDate: new Date().toLocaleDateString(),
      errorMessage: data.errorMessage
    });

    await transporter.sendMail({
      from: `"The Capital Hub" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: isSuccess ? "Purchase Successful" : "Purchase Failed",
      html: emailContent,
    });
  } catch (error) {
    console.error("Error sending purchase email:", error);
  }
}

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
    const community = await community_schema.findOne({ 
      _id: communityId,
      is_deleted: false 
    })
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
      is_deleted: false,
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
    const communities = await community_schema.find({ is_deleted: false })
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
    community.whatsapp_group_link = updatedData.whatsapp_group_link || community.whatsapp_group_link;

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
      new Map(community.members.map(item => [item.member, item])).values()
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
    const user = await UserModel.findById(userId);
    
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

    if (product.purchased_by.includes(userId)) {
      // Send failure email
      await sendPurchaseEmail(user.email, {
        userName: user.firstName,
        communityName: community.name,
        productName: product.name,
        productPrice: product.price,
        errorMessage: "Product already purchased"
      }, false);

      return {
        status: 400,
        message: "You have already purchased this product"
      };
    }

    product.purchased_by.push(userId);
    await community.save();

    // Send success email
    await sendPurchaseEmail(user.email, {
      userName: user.firstName,
      communityName: community.name,
      productName: product.name,
      productPrice: product.price
    });

    return {
      status: 200,
      message: "Product purchased successfully",
      data: product
    };
  } catch (error) {
    console.error(error);
    
    // Send failure email if user exists
    if (user) {
      await sendPurchaseEmail(user.email, {
        userName: user.firstName,
        communityName: community?.name || 'Unknown',
        productName: product?.name || 'Unknown',
        productPrice: product?.price || 0,
        errorMessage: "An unexpected error occurred"
      }, false);
    }

    return {
      status: 500,
      message: "An error occurred while purchasing the product"
    };
  }
};

// Generate order ID helper function
async function generateOrderId() {
  try {
    const uniqueId = crypto.randomBytes(16).toString("hex");
    const hash = crypto.createHash("sha256");
    hash.update(uniqueId);
    return hash.digest("hex").substr(0, 12);
  } catch (error) {
    console.error("Error generating order ID:", error);
    throw new Error("Failed to generate order ID");
  }
}

export const createPaymentSession = async (data) => {
  try {
    const orderId = await generateOrderId();
    const customerId = uuidv4();

    const request = {
      order_amount: parseFloat(data.amount).toFixed(2),
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: customerId,
        customer_name: data.name.trim(),
        customer_email: data.email.toLowerCase().trim(),
        customer_phone: data.mobile.trim(),
      },
      order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };

    const response = await Cashfree.PGCreateOrder("2023-08-01", request);

    if (!response?.data?.payment_session_id) {
      throw new Error("Invalid response from payment gateway");
    }

    return {
      status: 200,
      data: response.data,
    };
  } catch (error) {
    console.error("Error in creating payment session:", error);
    throw new Error(error.message);
  }
};

export const verifyPayment = async (orderId, entityId, entityType, userData) => {
  try {
    const response = await Cashfree.PGOrderFetchPayments("2023-08-01", orderId);
    
    if (!response?.data) {
      throw new Error("Invalid response from payment gateway");
    }
    const paymentStatus = response.data[0].payment_status;
    const validPaymentStatuses = ["SUCCESS", "FAILED", "PENDING", "USER_DROPPED", "NOT_ATTEMPTED"];
    return {
      status: 200,
      data: {
        orderId,
        paymentId: response.data[0].cf_payment_id,
        amount: response.data[0].payment_amount,
        currency: response.data[0].payment_currency,
        status: paymentStatus,
        isPaymentSuccessful: paymentStatus === "SUCCESS",
        paymentMethod: response.data[0].payment_group,
        paymentTime: response.data[0].payment_completion_time,
      },
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

export const softDeleteCommunity = async (communityId, userId, reason) => {
  try {
    const community = await community_schema.findOne({ 
      _id: communityId, 
      adminId: userId,
      is_deleted: false 
    });

    if (!community) {
      return {
        status: 404,
        message: 'Community not found or you are not authorized'
      };
    }

    community.is_deleted = true;
    community.deletion_reason = reason;
    community.deleted_at = new Date();
    await community.save();

    // Send email to all members
    const members = await UserModel.find({ _id: { $in: community.members } });
    const admin = await UserModel.findById(userId);

    for (const member of members) {
      await sendCommunityDeletionEmail(member.email, {
        communityId: community._id,
        memberName: member.firstName,
        communityName: community.name,
        adminName: `${admin.firstName} ${admin.lastName}`,
        reason: reason
      });
    }

    await sendCommunityDeletionEmail("dev.capitalhub@gmail.com", {
      communityId: community._id,
      memberName: "The Capital Hub",
      communityName: community.name,
      adminName: `${admin.firstName} ${admin.lastName}`,
      reason: reason
    });

    return {
      status: 200,
      message: 'Community deleted successfully'
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: 'An error occurred while deleting the community'
    };
  }
};

export const removeMember = async (communityId, adminId, memberId, reason) => {
  try {
    const community = await community_schema.findOne({ 
      _id: communityId, 
      adminId: adminId,
      is_deleted: false 
    });

    if (!community) {
      return {
        status: 404,
        message: 'Community not found or you are not authorized'
      };
    }

    community.members = community.members.filter(member => member.member.toString() !== memberId);
    community.removed_members.push({
      member: memberId,
      reason: reason,
      removed_at: new Date(),
      removed_by: adminId
    });
    await community.save();

    // Send email to removed member
    const member = await UserModel.findById(memberId);
    const admin = await UserModel.findById(adminId);
    await sendMemberRemovalEmail(member.email, {
      memberName: member.firstName,
      communityName: community.name,
      adminName: `${admin.firstName} ${admin.lastName}`,
      reason: reason
    });

    return {
      status: 200,
      message: 'Member removed successfully'
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: 'An error occurred while removing the member'
    };
  }
};

export const leaveCommunity = async (communityId, userId, reason) => {
  try {
    const community = await community_schema.findOne({ 
      _id: communityId,
      'members.member': userId,
      is_deleted: false 
    });

    if (!community) {
      return {
        status: 404,
        message: 'Community not found or you are not a member'
      };
    }

    // Remove member and add to removed_members with reason
    community.members = community.members.filter(m => m.member.toString() !== userId);
    community.removed_members.push({
      member: userId,
      reason: reason,
      removed_at: new Date(),
      removed_by: userId // self-removal
    });
    await community.save();

    // Send email to admin
    const member = await UserModel.findById(userId);
    const admin = await UserModel.findById(community.adminId);
    await sendMemberLeaveEmail(admin.email, {
      memberName: `${member.firstName} ${member.lastName}`,
      communityName: community.name,
      reason: reason
    });

    return {
      status: 200,
      message: 'Successfully left the community'
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: 'An error occurred while leaving the community'
    };
  }
};

// Function to send join request email to admin
export const sendJoinRequestEmail = async (data) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const emailContent = `
        <h1>Join WhatsApp Group Request</h1>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone Number:</strong> ${data.phoneNumber}</p>
        <p><strong>Requested Number:</strong> ${data.requestedNumber}</p>
    `;

    await transporter.sendMail({
        from: `"The Capital Hub" <${process.env.EMAIL_USER}>`,
        to: data.adminEmail,
        subject: "WhatsApp Group Join Request",
        html: emailContent,
    });
};
