import { Resource } from '../models/Resource.js';
import { cloudinary } from "../utils/uploadImage.js";

// Create a new resource
export const create = async (resourceData, files) => {
  try {
    const fileLinks = [];
    
    if (files && files.length > 0) {
      // Process each file
      const uploadPromises = files.map(async (file) => {
        try {
          // Determine folder and resource type based on mimetype
          const isVideo = file.mimetype.startsWith('video');
          const isImage = file.mimetype.startsWith('image');
          const isDocument = !isVideo && !isImage;

          const folder = isVideo 
            ? `${process.env.CLOUDIANRY_FOLDER}/resources/videos`
            : isImage 
              ? `${process.env.CLOUDIANRY_FOLDER}/resources/images`
              : `${process.env.CLOUDIANRY_FOLDER}/resources/documents`;

          const uploadOptions = {
            folder,
            resource_type: isVideo ? 'video' : 'auto',
            format: isImage ? 'webp' : undefined,
            unique_filename: true,
          };

          const { secure_url } = await cloudinary.uploader.upload(file.path, uploadOptions);
          return secure_url;
        } catch (fileError) {
          console.error(`Error uploading file ${file.originalname}:`, fileError);
          return null;
        }
      });

      const uploadedLinks = await Promise.all(uploadPromises);
      fileLinks.push(...uploadedLinks.filter(link => link !== null));

      if (fileLinks.length === 0) {
        throw new Error("Failed to upload any files");
      }
    }

    const resource = new Resource({
      ...resourceData,
      link: fileLinks
    });

    const savedResource = await resource.save();
    return savedResource;

  } catch (error) {
    console.error("Error creating resource:", error);
    throw new Error(`Error creating resource: ${error.message}`);
  }
};

// Get all resources
export const getAll = async (query = {}) => {
  try {
    return await Resource.find(query);
  } catch (error) {
    throw new Error(`Error fetching resources: ${error.message}`);
  }
};

// Get a single resource by ID
export const getById = async (id) => {
  try {
    const resource = await Resource.findById(id);
    if (!resource) {
      throw new Error('Resource not found');
    }
    return resource;
  } catch (error) {
    throw new Error(`Error fetching resource: ${error.message}`);
  }
};

// Update a resource
export const update = async (id, updateData) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!resource) {
      throw new Error('Resource not found');
    }
    return resource;
  } catch (error) {
    throw new Error(`Error updating resource: ${error.message}`);
  }
};

// Delete a resource
export const remove = async (id) => {
  try {
    const resource = await Resource.findByIdAndDelete(id);
    if (!resource) {
      throw new Error('Resource not found');
    }
    return resource;
  } catch (error) {
    throw new Error(`Error deleting resource: ${error.message}`);
  }
};
