import multer from 'multer';

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Manejar errores específicos de Multer
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'El archivo es demasiado grande. Tamaño máximo: 50MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Demasiados archivos. Máximo: 10 archivos'
      });
    }
  }
  
  // Manejar error de tipo de archivo
  if (err.message === 'Tipo de archivo no permitido') {
    return res.status(400).json({
      message: 'Tipo de archivo no permitido. Solo se permiten imágenes, videos, PDF y documentos de Office'
    });
  }

  // Manejar errores de validación de Mongoose
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Error de validación',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  // Manejar errores de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Token inválido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expirado'
    });
  }

  // Error por defecto
  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor'
  });
};

export default errorHandler;
