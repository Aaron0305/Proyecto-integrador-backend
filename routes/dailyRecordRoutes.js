import express from 'express';
import { createRecord, getRecordsByUser } from '../controllers/dailyRecordController.js';
import { verifyToken } from '../middleware/auth.js';
import { upload } from '../controllers/dailyRecordController.js';

const router = express.Router();

// Ruta para crear un nuevo registro con archivos
router.post('/create', verifyToken, upload.array('evidencias'), createRecord);

// Ruta para obtener registros por usuario
router.get('/user/:id', verifyToken, getRecordsByUser);

export default router;
