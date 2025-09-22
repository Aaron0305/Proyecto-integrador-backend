import express from 'express';
import { getTeacherStats } from '../controllers/statsController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Ruta para obtener estadísticas de docentes
// Requiere autenticación y rol de administrador
router.get('/teachers', verifyToken, getTeacherStats);

export default router; 