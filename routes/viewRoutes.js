/**
 * View Routes
 * Handles all view rendering routes
 */
import express from 'express';
import { renderHomePage, renderNotFound } from '../controllers/viewController.js';

const router = express.Router();

// GET / - Home page
router.get('/', renderHomePage);

// 404 - Not found
router.use('*', renderNotFound);

export default router;
