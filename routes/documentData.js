import express from "express";
import {
  uploadDocumentController,
  createFolderController,
  getFolderByUserController,
  getDocumentByUserController,
  getDocumentList,
  deleteFolderController,
  renameFolderController,
  deleteDocumentController,
} from "../controllers/documentDataController.js";
// import upload from "../utils/file.helper.js"
import multer from "multer";
const router = express.Router();

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 
  }
});

router.get("/getDocument", getDocumentList);
router.post("/uploadDocument", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File size cannot exceed 10MB' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      // An unknown error occurred
      return res.status(500).json({ error: 'Something went wrong' });
    }
    // If no error, proceed with your controller
    uploadDocumentController(req, res, next);
  });
});
router.post("/getDocumentsByUser", getDocumentByUserController);
router.post("/createFolder", createFolderController);
router.get("/getFolderByUser/:oneLinkId", getFolderByUserController);
router.patch("/renameFolder", renameFolderController);
router.delete("/deleteFolder", deleteFolderController);
router.delete("/deleteDocument/:id", deleteDocumentController);

export default router;
