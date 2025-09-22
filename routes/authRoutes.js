import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { uploadProfile } from '../middleware/profileUploadMiddleware.js';
import emailService from '../services/emailService.js';

const router = express.Router();

// Ruta de registro sin rate limiting
router.post('/register', uploadProfile, async (req, res) => {  try {
    const { 
      email, 
      password, 
      numeroControl, 
      nombre, 
      apellidoPaterno, 
      apellidoMaterno, 
      carrera,
      role, // Agregamos el role a los campos que extraemos
      semestre 
    } = req.body;

    // Guardar la URL de Cloudinary de la foto si se subió una
    const fotoPerfil = req.file ? req.file.cloudinaryUrl : null;

    const userExists = await User.findOne({
      $or: [{ email }, { numeroControl }]
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: userExists.email === email 
          ? 'Este correo electrónico ya está registrado' 
          : 'Este número de control ya está registrado'
      });
    }

    // Validar que el role sea válido
    if (role && !['admin', 'docente'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido. Debe ser "admin" o "docente"'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      numeroControl,
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      carrera,
      semestre,
      fotoPerfil,
      role: role || 'docente' // Asegurarnos de incluir el role
    });

    const savedUser = await user.save();
    const token = jwt.sign(
      { id: savedUser._id },
      process.env.JWT_SECRET || 'tu_secreto_muy_seguro_123',
      { expiresIn: '7d' } // Aumentado a 7 días para debugging
    );

    const userResponse = {
      _id: savedUser._id,
      email: savedUser.email,
      numeroControl: savedUser.numeroControl,
      nombre: savedUser.nombre,
      apellidoPaterno: savedUser.apellidoPaterno,
      apellidoMaterno: savedUser.apellidoMaterno,
      carrera: savedUser.carrera,
      semestre: savedUser.semestre,
      fotoPerfil: savedUser.fotoPerfil,
      role: savedUser.role
    };

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      error: error.message
    });
  }
});

// Ruta de login sin rate limiting
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('carrera', 'nombre');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Correo o contraseña incorrectos'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Correo o contraseña incorrectos'
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'tu_secreto_muy_seguro_123',
      { expiresIn: '7d' } // Aumentado a 7 días para debugging
    );

    const userResponse = {
      _id: user._id,
      email: user.email,
      numeroControl: user.numeroControl,
      nombre: user.nombre,
      apellidoPaterno: user.apellidoPaterno,
      apellidoMaterno: user.apellidoMaterno,
      carrera: user.carrera,
      semestre: user.semestre,
      fotoPerfil: user.fotoPerfil,
      role: user.role
    };

    res.json({
      success: true,
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error.message
    });
  }
});

// Ruta para verificar token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No hay token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_jwt_secret');
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('carrera', 'nombre');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Error en verificación:', error);
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
});

// Ruta para solicitar recuperación de contraseña sin rate limiting
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico es requerido'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Por favor ingresa un correo electrónico válido'
      });
    }

    const user = await User.findOne({ email }).populate('carrera', 'nombre');

    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      return res.json({
        success: true,
        message: 'Si existe una cuenta con ese correo electrónico, recibirás un enlace de recuperación en breve.'
      });
    }

    // Generar token de recuperación (válido por 1 hora)
    const resetToken = jwt.sign(
      { id: user._id, type: 'password-reset' },
      process.env.JWT_SECRET || 'tu_jwt_secret',
      { expiresIn: '1h' }
    );

    // Actualizar usuario con el token de reset
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await user.save();

    // Enviar email de recuperación
    try {
      await emailService.sendPasswordResetEmail(email, resetToken, user);
      
      console.log(`✅ Solicitud de recuperación procesada para: ${email}`);
      
      res.json({
        success: true,
        message: 'Si existe una cuenta con ese correo electrónico, recibirás un enlace de recuperación en breve.',
        // En desarrollo, mostrar información adicional
        ...(process.env.NODE_ENV === 'development' && {
          dev_info: {
            resetToken,
            resetUrl: `https://frontend-opal-omega-97.vercel.app/reset-password?token=${resetToken}`
          }
        })
      });

    } catch (emailError) {
      console.error('❌ Error enviando email de recuperación:', emailError);
      
      // Limpiar token si el email falla
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      res.status(500).json({
        success: false,
        message: 'Error al enviar el correo de recuperación. Inténtalo de nuevo más tarde.'
      });
    }

  } catch (error) {
    console.error('❌ Error en forgot-password:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Ruta para restablecer contraseña con rate limiting y confirmación por email
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token y nueva contraseña son requeridos'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_jwt_secret');
    
    if (decoded.type !== 'password-reset') {
      return res.status(400).json({
        success: false,
        message: 'Token inválido'
      });
    }

    const user = await User.findById(decoded.id).populate('carrera', 'nombre');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar que el token coincida y no haya expirado
    if (user.resetPasswordToken !== token || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Token de recuperación inválido o expirado'
      });
    }

    // Encriptar la nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar la contraseña y limpiar campos de reset
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Enviar email de confirmación de cambio
    try {
      await emailService.sendPasswordChangeConfirmation(user.email, user);
      console.log(`✅ Contraseña restablecida y email de confirmación enviado para: ${user.email}`);
    } catch (emailError) {
      console.error('⚠️ Error enviando email de confirmación:', emailError);
      // No fallar la operación por esto
    }

    res.json({
      success: true,
      message: 'Contraseña restablecida exitosamente. Se ha enviado una confirmación a tu correo electrónico.'
    });

  } catch (error) {
    console.error('❌ Error en reset-password:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;