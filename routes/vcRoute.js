import express from "express";

import { addVcController, getVcController, updateVcController } from "../controllers/vcController.js";

const router = express.Router();

router.post('/getVcById', getVcController);
router.post('/createVc', addVcController);
router.put('/updateVc', updateVcController);

export default router;