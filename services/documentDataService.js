import { cloudinary } from "../utils/uploadImage.js";
    // Read the file into a buffer
    const fileBuffer = await fs.readFile(file.path);
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.originalname}`;
    // Create file object
    const fileObject = {
    let fileUrl = ""; // Initialize variable for fileUrl
    if (videoUrl) {
      // Upload video or image to Cloudinary
      const { secure_url } = await cloudinary.uploader.upload(file.path, {
        folder: `${process.env.CLOUDINARY_FOLDER}/onelinkPitch`,
        format: "webp",
        unique_filename: true,
      });

      fileUrl = secure_url; // Store the secure URL from Cloudinary
    } else {
      // Upload file to Google Drive
      const driveResponse = await uploadFileToDrive(fileObject, fileName);
      
      // Check if Google Drive response contains webViewLink
      if (!driveResponse.webViewLink) {
        throw new Error("Google Drive response does not contain webViewLink");
      }
      fileUrl = driveResponse.webViewLink; // Store the Drive URL

    // Create a new file model with the appropriate URL
    let newFile;
    if (videoUrl) {
        fileUrl: fileUrl,
        videoUrl: videoUrl, // Store the original videoUrl if provided
      });
    } else {
      newFile = new FileModel({
        userId: userId,
        fileName: fileName,
        folderName: folderName,
        fileUrl: fileUrl,

    // Save the file metadata to the database
    await newFile.save();
    throw new Error(`Error uploading document: ${error.message}`);
