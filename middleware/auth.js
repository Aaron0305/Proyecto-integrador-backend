import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('🔍 Auth Header:', authHeader ? 'Presente' : 'Ausente');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No hay token de autorización válido');
      return res.status(401).json({
        success: false,
        message: 'Sesión expirada. Por favor, inicia sesión nuevamente.'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 Token encontrado:', token ? 'Sí' : 'No');
    
    // Verificar el JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET || 'tu_secreto_muy_seguro_123';
    console.log('🔐 JWT Secret configurado:', jwtSecret ? 'Sí' : 'No');
    
    const decoded = jwt.verify(token, jwtSecret);
    console.log('✅ Token decodificado:', decoded);
    
    // Obtener el usuario completo de la base de datos
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      console.log('❌ Usuario no encontrado en BD');
      return res.status(401).json({
        success: false,
        message: 'Sesión expirada. Por favor, inicia sesión nuevamente.'
      });
    }

    console.log('👤 Usuario autenticado:', user.email, 'Role:', user.role);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Error de autenticación:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Sesión inválida. Por favor, inicia sesión nuevamente.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Sesión expirada. Por favor, inicia sesión nuevamente.'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Sesión expirada. Por favor, inicia sesión nuevamente.'
    });
  }
};

export const isAdmin = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Acceso denegado: se requieren permisos de administrador' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al verificar permisos' });
  }
};

// Alias para compatibilidad
export const auth = verifyToken;
