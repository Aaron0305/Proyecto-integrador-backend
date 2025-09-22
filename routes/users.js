import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Assignment from '../models/Assignment.js';
import { uploadProfile } from '../middleware/profileUploadMiddleware.js';
import { getAllUsers } from '../controllers/userController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Ruta para obtener todos los usuarios
router.get('/', getAllUsers);

// Endpoint para obtener registros/asignaciones de un usuario por su ID
router.get('/:userId/registros', async (req, res) => {
  try {
    const assignments = await Assignment.find({ assignedTo: req.params.userId })
      .select('title description dueDate closeDate status createdAt')
      .lean();
    const registros = assignments.map(a => ({
      titulo: a.title,
      descripcion: a.description,
      fechaEntrega: a.dueDate,
      fechaCierre: a.closeDate,
      estado: a.status === 'completed' ? 'Entregado' : a.status === 'completed-late' ? 'Entregado con Retraso' : a.status === 'pending' ? 'Pendiente' : a.status === 'not-delivered' ? 'No Entregado' : a.status,
      creado: a.createdAt
    }));
    res.json(registros);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para servir imágenes de perfil
router.get('/profile-image/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user || !user.fotoPerfil) {
      return res.status(404).send('Imagen no encontrada');
    }
    
    const imagePath = path.join(__dirname, '..', 'uploads', 'perfiles', user.fotoPerfil);
    res.sendFile(imagePath);
  } catch (error) {
    console.error('Error al servir la imagen de perfil:', error);
    res.status(500).send('Error al cargar la imagen');
  }
});

// Endpoint para verificar email único
router.get('/check-email', async (req, res) => {
  const { email } = req.query;
  const exists = await User.exists({ email: email?.toLowerCase() });
  res.json({ exists: !!exists });
});

// Endpoint para verificar número de control único
router.get('/check-numero-control', async (req, res) => {
  const { numeroControl } = req.query;
  const exists = await User.exists({ numeroControl });
  res.json({ exists: !!exists });
});

router.post('/update-profile-image', uploadProfile, async (req, res) => {
  try {
    const userId = req.user.id; // Asumiendo que tienes middleware de autenticación
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ninguna imagen'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { fotoPerfil: file.filename },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Imagen de perfil actualizada correctamente',
      user
    });
  } catch (error) {
    console.error('Error al actualizar imagen de perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la imagen de perfil'
    });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, numeroControl } = req.body;

    // Validación más robusta
    const existingEmail = await User.findOne({ email: email?.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ya está registrado'
      });
    }

    const existingNumControl = await User.findOne({ numeroControl });
    if (existingNumControl) {
      return res.status(400).json({
        success: false,
        message: 'El número de control ya está registrado'
      });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({
      ...req.body,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente'
    });

  } catch (error) {
    console.error('Error en registro:', error);
    
    // Manejar errores de índice único
    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        return res.status(400).json({
          success: false,
          message: 'El correo electrónico ya está registrado'
        });
      }
      if (error.keyPattern?.numeroControl) {
        return res.status(400).json({
          success: false,
          message: 'El número de control ya está registrado'
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario'
    });
  }
});

// Mejoramos la ruta de login con más validaciones y logs
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Intento de login con email:', email);

    // Buscar usuario
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('Usuario no encontrado');
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('¿Contraseña válida?:', isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    // Crear token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'tu_secret_temporal',
      { expiresIn: '24h' }
    );

    // Enviar respuesta exitosa con el rol del usuario
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        nombre: user.nombre,
        numeroControl: user.numeroControl,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión'
    });
  }
});

export default router;
