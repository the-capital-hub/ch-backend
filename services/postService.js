import { PostModel } from "../models/Post.js";
import { UserModel } from "../models/User.js";
import { cloudinary } from "../utils/uploadImage.js";
import { addNotification, deleteNotification } from "./notificationService.js";
import fetch from "node-fetch";
export const createNewPost = async (data) => {
	try {
		if (data?.image) {
			const { secure_url } = await cloudinary.uploader.upload(data.image, {
				folder: `${process.env.CLOUDIANRY_FOLDER}/posts/images`,
				format: "webp",
				unique_filename: true,
			});
			data.image = secure_url;
		}
		if (data?.images) {
			const uploadedImages = await Promise.all(
				data.images.map(async (image) => {
					const { secure_url } = await cloudinary.uploader.upload(image, {
						folder: `${process.env.CLOUDIANRY_FOLDER}/posts/images`,
						format: "webp",
						unique_filename: true,
					});
					return secure_url;
				})
			);
			data.images = uploadedImages;
		}
		if (data?.video) {
			const { secure_url } = await cloudinary.uploader.upload(data.video, {
				folder: `${process.env.CLOUDIANRY_FOLDER}/posts/videos`,
				resource_type: "video",
				// format: "webm",
				unique_filename: true,
			});
			data.video = secure_url;
		}
		if (data.resharedPostId) {
			const sharedPost = await PostModel.findByIdAndUpdate(
				data.resharedPostId,
				{
					$inc: { resharedCount: 1 },
				}
			);
			const type = "postShared";
			await addNotification(
				sharedPost.user,
				data.user,
				type,
				data.resharedPostId
			);
			data.resharedPostId = await PostModel.findById(
				data.resharedPostId
			).populate("user");
		}

		// Handle poll options if they exist
		if (data.pollOptions) {
			// Ensure pollOptions is an array
			const optionsArray = Array.isArray(data.pollOptions)
				? data.pollOptions
				: Object.values(data.pollOptions);

			// Create poll options objects from the provided data
			const newPollOptions = optionsArray.map((optionText) => ({
				option: optionText,
				votes: [],
			}));

			data.pollOptions = newPollOptions;
		}

		const newPost = new PostModel(data);
		const post = await newPost.save();

		if (data.postType === "company") {
			const user = await UserModel.findOne({ _id: data.user });
			user.companyUpdate.push(post._id);
			await user.save();
		}

		// Populate all necessary fields
		await newPost.populate([
			{
				path: "user",
				populate: ["startUp", "investor"],
			},
			{
				path: "pollOptions",
				select: "option votes", // Explicitly select the fields we want
			},
		]);

		return newPost;
	} catch (error) {
		console.error(error);
		throw new Error("Error creating new post");
	}
};

export const allPostsData = async (page, perPage) => {
	try {
		const skip = (page - 1) * perPage;

		const allPosts = await PostModel.find()
			.populate({
				path: "user",
				select:
					"firstName lastName designation profilePicture location investor startUp oneLinkId isSubscribed isTopVoice",
				populate: [
					{
						path: "investor",
						select: "companyName",
					},
					{
						path: "startUp",
						select: "company",
					},
				],
			})
			.populate({
				path: "resharedPostId",
				select: "",
				populate: [
					{
						path: "user",
						select:
							"firstName lastName designation profilePicture investor startUp oneLinkId",
						populate: [
							{
								path: "investor",
								select: "companyName",
							},
							{
								path: "startUp",
								select: "company",
							},
						],
					},
				],
			})
			.sort({ _id: -1 })
			.skip(skip)
			.limit(perPage);

		return allPosts;
	} catch (error) {
		throw new Error("Error fetching all posts");
	}
};
export const userPost = async (user) => {
	try {
		const userData = await UserModel.findById(user).populate("connections");
		const allPosts = await PostModel.find({ user });
		return { allPosts, userData };
	} catch (error) {
		throw new Error("Error fetching all posts");
	}
};
export const singlePostData = async (_id) => {
	try {
		const post = await PostModel.findOne({ _id })
			.populate({
				path: "user",
				select:
					"firstName lastName designation profilePicture investor startUp oneLinkId",
				populate: [
					{
						path: "investor",
						select: "companyName",
					},
					{
						path: "startUp",
						select: "company",
					},
				],
			})
			.populate({
				path: "resharedPostId",
				select: "",
				populate: [
					{
						path: "user",
						select:
							"firstName lastName designation profilePicture investor startUp oneLinkId",
						populate: [
							{
								path: "investor",
								select: "companyName",
							},
							{
								path: "startUp",
								select: "company",
							},
						],
					},
				],
			})
			.populate({
				path: "likes",
				select: "firstName lastName profilePicture", // Adjust fields as needed
			})
			.populate({
				path: "comments.user", // Populate user field in comments
				select:
					"firstName lastName designation profilePicture investor startUp oneLinkId",
				populate: [
					{
						path: "investor",
						select: "companyName",
					},
					{
						path: "startUp",
						select: "company",
					},
				],
			})
			.populate({
				path: "pollOptions.votes", // Populate votes in pollOptions
				select: "firstName lastName profilePicture", // Adjust fields as needed
			});

		return post;
	} catch (error) {
		console.error(error);
		throw new Error("Error getting post");
	}
};

//Like a post
export const likeUnlikePost = async (postId, userId) => {
	try {
		const post = await PostModel.findById(postId);
		if (!post) {
			return {
				status: 404,
				message: "Post not found",
			};
		}
		const hasLiked = post.likes.includes(userId);
		if (hasLiked) {
			post.likes.pull(userId);
			const type = "postLiked";
			deleteNotification(post.user, userId, type, postId);
		} else {
			post.likes.push(userId);
			const type = "postLiked";
			await addNotification(post.user, userId, type, postId);
		}
		await post.save();
		return {
			status: 200,
			message: hasLiked ? "Post Unliked" : "Post Liked",
			data: post,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while liking/unliking the post.",
		};
	}
};

// Comment on a post
export const commentOnPost = async (postId, userId, text) => {
	try {
		const post = await PostModel.findById(postId);
		if (!post) {
			return {
				status: 404,
				message: "Post not found",
			};
		}
		const newComment = {
			user: userId,
			text,
		};
		post.comments.push(newComment);
		await post.save();
		const type = "postCommented";
		await addNotification(post.user, userId, type, postId);
		return {
			status: 200,
			message: "Comment added successfully",
			data: post,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while adding the comment.",
		};
	}
};

// get comments by post
export const getComments = async (postId) => {
	try {
		const post = await PostModel.findById(postId).populate({
			path: "comments.user",
			model: "Users",
			select:
				"firstName lastName designation profilePicture investor startUp oneLinkId isTopVoice",
			populate: [
				{
					path: "investor",
					select: "companyName",
				},
				{
					path: "startUp",
					select: "company",
				},
			],
		});
		if (!post) {
			return {
				status: 404,
				message: "Post not found",
			};
		}
		const sortedComments = post.comments.sort((a, b) => {
			if (b.likes.length !== a.likes.length) {
				return b.likes.length - a.likes.length;
			} else {
				return b.createdAt - a.createdAt;
			}
		});
		return {
			status: 200,
			message: "Comments retrieved successfully",
			data: sortedComments,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while fetching comments.",
		};
	}
};

// save post
export const savePost = async (userId, collectionName, postId) => {
	try {
		const user = await UserModel.findById(userId);
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}

		let collection = user.savedPosts.find((c) => c.name === collectionName);

		if (!collection) {
			collection = {
				name: collectionName,
				posts: [],
			};
			collection.posts.push(postId);
			user.savedPosts.push(collection);
			await user.save();
			return {
				status: 200,
				message: "Post saved successfully",
			};
		}
		if (collection.posts.includes(postId)) {
			return {
				status: 400,
				message: "Post is already in the collection",
			};
		}
		collection.posts.push(postId);
		await user.save();
		return {
			status: 200,
			message: "Post saved successfully",
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while saving the post.",
		};
	}
};

export const unsavePost = async (userId, postId) => {
	try {
		const user = await UserModel.findById(userId);
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}
		for (let i = 0; i < user.savedPosts.length; i++) {
			const collection = user.savedPosts[i];
			const postIndex = collection.posts.indexOf(postId);

			if (postIndex !== -1) {
				collection.posts.splice(postIndex, 1);
				if (collection.posts.length === 0) {
					user.savedPosts.splice(i, 1);
				}
				await user.save();
				return {
					status: 200,
					message: "Post unsaved successfully",
				};
			}
		}
		return {
			status: 400,
			message: "Post not found in any collection",
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while unsaving the post.",
		};
	}
};

//get all collections
export const getAllSavedPostCollections = async (userId) => {
	try {
		const user = await UserModel.findById(userId);
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}
		const collections = user.savedPosts;
		return {
			status: 200,
			message: "Saved post collections retrieved successfully",
			data: collections,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while fetching saved post collections.",
		};
	}
};

//get saved post by collection name
export const getSavedPostsByCollection = async (userId, collectionName) => {
	try {
		const user = await UserModel.findById(userId);
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}
		let collection = {};
		if (collectionName === "my saved posts") {
			const posts = user.savedPosts.map((c) => c.posts);
			collection = {
				name: "my saved posts",
				posts: posts.flat(1),
			};
		} else {
			collection = user.savedPosts.find((c) => c.name === collectionName);
		}
		if (!collection) {
			return {
				status: 404,
				message: `Collection not found`,
			};
		}
		const postIds = collection.posts;
		const savedPosts = await PostModel.find({ _id: { $in: postIds } })
			.populate({
				path: "user",
				select: "firstName lastName profilePicture designation oneLinkId",
			})
			.exec();
		for (let i = 0; i < savedPosts.length; i++) {
			if (savedPosts[i].resharedPostId) {
				const resharedPost = await PostModel.findById(
					savedPosts[i].resharedPostId
				)
					.populate({
						path: "user",
						select: "firstName lastName profilePicture designation oneLinkId",
					})
					.exec();
				savedPosts[i].resharedPostId = resharedPost;
			}
		}
		return {
			status: 200,
			message: `Saved posts retrieved successfully`,
			data: savedPosts,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message:
				"An error occurred while fetching saved posts by collection name.",
		};
	}
};

//get like count
export const getLikeCount = async (postId) => {
	try {
		const post = await PostModel.findById(postId).populate("likes");
		if (!post) {
			return {
				status: 404,
				message: "Post not found",
			};
		}
		const likeCount = post.likes.length;
		let likedBy;
		if (likeCount === 0) {
			likedBy = null;
		} else if (likeCount === 1) {
			const user = post.likes[0];
			likedBy = user ? user.firstName : "Unknown User";
		} else {
			const usersWhoLiked = post.likes.slice(0, 2);
			const otherCount = likeCount - 2;
			likedBy = usersWhoLiked.map((user) => user.firstName).join(", ");
			if (otherCount > 0) {
				likedBy += `, and ${otherCount} others`;
			}
		}

		return {
			status: 200,
			message: `${likeCount} ${
				likeCount === 1 ? "person" : "people"
			} liked this post`,
			data: {
				count: likeCount,
				likedBy,
				users: post.likes,
			},
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while fetching like count",
		};
	}
};

// get users who liked the post
export const getUsersWhoLikedPost = async (postId) => {
	try {
		const post = await PostModel.findById(postId);
		if (!post) {
			return {
				status: 404,
				message: "Post not found",
			};
		}
		const likedUsers = await PostModel.findById(postId).populate({
			path: "likes",
			select: "firstName lastName profilePicture oneLinkId",
		});
		return {
			status: 200,
			message: "Users who liked the post retrieved successfully",
			data: likedUsers.likes,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while fetching liked users.",
		};
	}
};

export const deletePost = async (postId, userId) => {
	try {
		const deletedPost = await PostModel.findOneAndDelete({
			_id: postId,
			user: userId,
		});
		const user = await UserModel.findOne({ _id: userId });
		if (user.companyUpdate.includes(postId)) {
			user.companyUpdate.filter((id) => id !== postId);
			user.save();
		}
		if (!deletedPost) {
			return {
				status: 404,
				message: "Post not found.",
			};
		}
		return {
			status: 200,
			message: "Post Deleted Successfully",
			data: deletedPost,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while deleting posts.",
		};
	}
};
export const addToCompanyUpdate = async (postId, userId) => {
	try {
		const user = await UserModel.findOne({ _id: userId });
		if (!user) {
			return {
				status: 404,
				message: "User not found.",
			};
		}
		if (user.companyUpdate.includes(postId)) {
			return {
				status: 400,
				message: "Post is already in featured posts.",
			};
		}

		user.companyUpdate.push(postId);
		await user.save();
		await PostModel.findOneAndUpdate({ _id: postId }, { postType: "company" });
		return {
			status: 200,
			message: "Post added to featured posts",
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while adding the post to featured posts.",
		};
	}
};
export const addToFeaturedPost = async (postId, userId) => {
	try {
		const user = await UserModel.findOne({ _id: userId });
		if (!user) {
			return {
				status: 404,
				message: "User not found.",
			};
		}
		if (user.featuredPosts.includes(postId)) {
			return {
				status: 400,
				message: "Post is already in featured posts.",
			};
		}
		user.featuredPosts.push(postId);
		await user.save();

		return {
			status: 200,
			message: "Post added to featured posts",
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while adding the post to featured posts.",
		};
	}
};

export const getCompanyUpdateByUser = async (userId) => {
	try {
		const user = await UserModel.findById(userId).populate("companyUpdate");

		if (!user) {
			return {
				status: 404,
				message: "User not found.",
				companyUpdate: [],
			};
		}

		return {
			status: 200,
			message: "Featured posts retrieved successfully.",
			user,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while retrieving featured posts.",
			companyUpdate: [],
		};
	}
};
export const getFeaturedPostsByUser = async (userId) => {
	try {
		const user = await UserModel.findById(userId).populate("featuredPosts");

		if (!user) {
			return {
				status: 404,
				message: "User not found.",
				featuredPosts: [],
			};
		}

		return {
			status: 200,
			message: "Featured posts retrieved successfully.",
			user,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while retrieving featured posts.",
			featuredPosts: [],
		};
	}
};

export const removeCompanyUpdatePost = async (postId, userId) => {
	try {
		const user = await UserModel.findByIdAndUpdate(
			userId,
			{ $pull: { companyUpdate: postId } },
			{ new: true }
		);
		await PostModel.findOneAndUpdate({ _id: postId }, { postType: "public" });
		if (!user) {
			return {
				status: 404,
				message: "User not found.",
			};
		}

		return {
			status: 200,
			message: "Post removed from featured posts.",
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while removing the post from featured posts.",
		};
	}
};
export const removeFromFeaturedPost = async (postId, userId) => {
	try {
		const user = await UserModel.findByIdAndUpdate(
			userId,
			{ $pull: { featuredPosts: postId } },
			{ new: true }
		);

		if (!user) {
			return {
				status: 404,
				message: "User not found.",
			};
		}

		return {
			status: 200,
			message: "Post removed from featured posts.",
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while removing the post from featured posts.",
		};
	}
};

export const deleteComment = async (postId, commentId, userId) => {
	try {
		const post = await PostModel.findById(postId);

		if (!post) {
			return {
				status: 404,
				message: "Post not found.",
			};
		}

		const type = "postCommented";
		await deleteNotification(post.user, userId, type, postId);

		const commentIndex = post.comments.findIndex((comment) =>
			comment._id.equals(commentId)
		);
		if (commentIndex === -1) {
			return {
				status: 404,
				message: "Comment not found.",
			};
		}
		post.comments.splice(commentIndex, 1);
		await post.save();
		return {
			status: 200,
			message: "Comment deleted successfully.",
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while deleting the comment.",
		};
	}
};

export const toggleCommentLike = async (postId, commentId, userId) => {
	try {
		const post = await PostModel.findById(postId);
		if (!post) {
			return {
				status: 404,
				message: "Post not found",
			};
		}
		const comment = post.comments.id(commentId);
		if (!comment) {
			return {
				status: 404,
				message: "Comment not found",
			};
		}
		const likedIndex = comment.likes.indexOf(userId);
		let likeStatusMessage = "";

		if (likedIndex === -1) {
			comment.likes.push(userId);
			likeStatusMessage = "Comment liked successfully";
		} else {
			comment.likes.splice(likedIndex, 1);
			likeStatusMessage = "Comment unliked successfully";
		}

		await post.save();

		const likeCount = comment.likes.length;
		return {
			status: 200,
			message: likeStatusMessage,
			likeCount: likeCount,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while toggling the comment like status.",
		};
	}
};

export const getPostById = async (postId) => {
	try {
		const post = await PostModel.findById(postId);
		if (!post) {
			return {
				status: 404,
				message: "Post not found.",
			};
		}

		return {
			status: 200,
			message: "Post removed from featured posts.",
			data: post,
		};
	} catch (error) {
		return {
			status: 500,
			message: "An error occurred while toggling the comment like status.",
		};
	}
};

export const sharePostOnLinkedin = async (
	linkedInPostData,
	token,
	s3ImageUrl
) => {
	try {
		// Check if s3ImageUrl is provided
		if (!s3ImageUrl || s3ImageUrl === undefined) {
			console.log("No image URL provided, sharing text only.");

			// Create the post without an image
			const postBody = {
				author: linkedInPostData.owner,
				lifecycleState: "PUBLISHED",
				specificContent: {
					"com.linkedin.ugc.ShareContent": {
						shareCommentary: {
							text: linkedInPostData.text.text,
						},
						shareMediaCategory: "NONE", // Indicating no media
					},
				},
				visibility: {
					"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
				},
			};

			// Share the post without image
			const postResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(postBody),
			});

			const postData = await postResponse.json();
			if (!postResponse.ok) {
				throw new Error(
					`Failed to create post: ${postResponse.status} ${
						postResponse.statusText
					} - ${JSON.stringify(postData)}`
				);
			}
			console.log("Post shared successfully:", postData);
			return postData; // Return post data if needed
		}

		// Fetch image from S3 that needs to be uploaded
		console.log("Fetching image from S3:", s3ImageUrl);
		const imageResponse = await fetch(s3ImageUrl);
		if (!imageResponse.ok) {
			throw new Error(
				"Failed to fetch image from S3: " + imageResponse.statusText
			);
		}
		const imageBlob = await imageResponse.blob(); // Get the image as a Blob

		// Register the upload
		const registerResponse = await fetch(
			"https://api.linkedin.com/v2/assets?action=registerUpload",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					registerUploadRequest: {
						owner: linkedInPostData.owner,
						recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
						serviceRelationships: [
							{
								relationshipType: "OWNER",
								identifier: "urn:li:userGeneratedContent",
							},
						],
					},
				}),
			}
		);

		if (!registerResponse.ok) {
			const errorDetail = await registerResponse.json();
			throw new Error(
				`Failed to register upload: ${registerResponse.status} ${
					registerResponse.statusText
				} - ${JSON.stringify(errorDetail)}`
			);
		}

		const registerData = await registerResponse.json();
		const uploadMechanism =
			registerData.value.uploadMechanism[
				"com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
			];
		if (!uploadMechanism) {
			throw new Error("Upload URL not found in the registration response.");
		}

		const uploadUrl = uploadMechanism.uploadUrl; // Get the upload URL
		const assetId = registerData.value.asset; // Get the asset ID

		console.log("Upload URL:", uploadUrl);
		console.log("Asset ID:", assetId);

		// Upload the image
		const uploadResponse = await fetch(uploadUrl, {
			method: "PUT",
			headers: {
				"Content-Type": imageBlob.type,
			},
			body: imageBlob,
		});

		if (!uploadResponse.ok) {
			throw new Error(
				"Failed to upload image: " +
					uploadResponse.status +
					" " +
					uploadResponse.statusText
			);
		}

		// Create the post with the uploaded image
		const postBody = {
			author: linkedInPostData.owner,
			lifecycleState: "PUBLISHED",
			specificContent: {
				"com.linkedin.ugc.ShareContent": {
					shareCommentary: {
						text: linkedInPostData.text.text,
					},
					shareMediaCategory: "IMAGE",
					media: [
						{
							status: "READY",
							description: {
								text: "Optional image description",
							},
							media: assetId,
							title: {
								text: "Optional image title",
							},
						},
					],
				},
			},
			visibility: {
				"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
			},
		};

		// Share the post with the image
		const postResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(postBody),
		});

		const postData = await postResponse.json();
		if (!postResponse.ok) {
			throw new Error(
				`Failed to create post: ${postResponse.status} ${
					postResponse.statusText
				} - ${JSON.stringify(postData)}`
			);
		}
		console.log("Post shared successfully:", postData);
	} catch (error) {
		console.error("Error sharing post on LinkedIn:", error);
		return {
			status: 500,
			message: error.message || "An error occurred",
		};
	}
};

export const voteForPoll = async (postId, optionId, userId) => {
    try {
        const post = await PostModel.findById(postId);

        if (!post) {
            return {
                status: 404,
                message: "Post Not Found",
            };
        }

        const option = post.pollOptions.id(optionId);

        if (!option) {
            return {
                status: 404,
                message: "Option Not Found",
            };
        }

        // Check if user has already voted
        const voteIndex = option.votes.indexOf(userId);
        const hasVoted = voteIndex !== -1;

        // If the post doesn't allow multiple answers, we need to check if the user has voted on any option
        if (!post.allow_multiple_answers && !hasVoted) {
            // Check if the user has already voted on another option
            const hasVotedOnOtherOptions = post.pollOptions.some((pollOption) => pollOption.votes.includes(userId));

            if (hasVotedOnOtherOptions) {
                return {
                    status: 400,
                    message: "You can only vote for one option.",
                };
            }
        }

        // Toggle the vote for the selected option
        if (hasVoted) {
            // Remove vote if the user already voted
            option.votes.splice(voteIndex, 1);
        } else {
            // Add vote if the user hasn't voted
            option.votes.push(userId);
        }

        // Save the updated post
        await post.save();

        return {
            status: 200,
            message: hasVoted ? "Vote removed successfully" : "Vote added successfully",
            data: post.pollOptions.toObject(), // Convert to plain object
        };
    } catch (error) {
        console.error("Error voting for poll:", error);
        throw error;
    }
};
