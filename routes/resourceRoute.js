import express from 'express';
import {
  createResource,
  getAllResources,
  getResourceById,
  updateResource,
  deleteResource,
} from '../controllers/resourceController.js';

const ResourceRouter = express.Router();

// POST /api/resources - Create a new resource
ResourceRouter.post('/create', createResource);

// GET /api/resources - Get all resources
ResourceRouter.get('/getAll', getAllResources);

// GET /api/resources/:id - Get a single resource by ID
ResourceRouter.get('/getById/:id', getResourceById);

// PUT /api/resources/:id - Update a resource
ResourceRouter.put('/update/:id', updateResource);

// DELETE /api/resources/:id - Delete a resource
ResourceRouter.delete('/delete/:id', deleteResource);

export default ResourceRouter;
