import path from 'path';

// Configuración para Cloudinary - No necesitamos crear directorios locales
const createUploadDirs = () => {
  // No crear directorios locales en Vercel
  console.log('📁 Usando Cloudinary para almacenamiento de archivos');
};

export const uploadConfig = {
  createUploadDirs,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo por archivo
    files: 10 // máximo 10 archivos por subida
  },
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/mpeg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
};
