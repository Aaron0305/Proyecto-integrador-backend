import express from 'express';
import { streamFile, downloadFile } from '../controllers/fileController.js';

const router = express.Router();

// Ruta para transmitir archivos
router.get('/stream', streamFile);

// Ruta para descargar archivos con nombre personalizado
router.get('/download', downloadFile);

export default router;
