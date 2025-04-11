/**
 * View Routes
 * Handles all view rendering routes
 */
import express from 'express';
import viewController from '../controllers/viewController.js';

const router = express.Router();

// GET / - Home page
router.get('/', viewController.renderHomePage);

// 404 - Not found
router.use('*', viewController.renderNotFound);

export default router;
