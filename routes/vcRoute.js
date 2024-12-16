import express from "express";

import { addVcController, getVcController } from "../controllers/vcController.js";

const router = express.Router();

router.post('/getVcById', getVcController);
router.post('/createVc', addVcController);

export default router;