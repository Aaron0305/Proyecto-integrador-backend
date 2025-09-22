    import asyncHandler from 'express-async-handler';
    import User from '../models/User.js';

    // @desc    Obtener el perfil del usuario
    // @route   GET /api/users/profile
    // @access  Private
    export const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {        res.json({
          _id: user._id,
          nombre: user.nombre,
          email: user.email,
          direccion: user.direccion,
          role: user.role,
          fotoPerfil: user.fotoPerfil,
        });
    } else {
        res.status(404);
        throw new Error('Usuario no encontrado');
    }
    });

    // @desc    Actualizar perfil de usuario
    // @route   PUT /api/users/profile
    // @access  Private
    export const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.nombre = req.body.nombre || user.nombre;
        user.email = req.body.email || user.email;
        
        // Actualizar foto de perfil si se proporciona
        if (req.file) {
            user.fotoPerfil = req.file.cloudinaryUrl;
        }
        
        // Si se proporciona una nueva contraseña
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
        _id: updatedUser._id,
        nombre: updatedUser.nombre,
        email: updatedUser.email,
        direccion: updatedUser.direccion,
        role: updatedUser.role,
        token: req.headers.authorization ? req.headers.authorization.split(' ')[1] : null,
        });
    } else {
        res.status(404);
        throw new Error('Usuario no encontrado');
    }
    });

    // @desc    Obtener todos los usuarios docentes
    // @route   GET /api/users
    // @access  Private/Admin
    export const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({ role: 'docente' })
        .select('numeroControl nombre apellidoPaterno apellidoMaterno email carrera fotoPerfil role')
        .populate('carrera', 'nombre')
        .lean();

    res.json({ users });
    });

    // @desc    Eliminar usuario
    // @route   DELETE /api/users/:id
    // @access  Private/Admin
    export const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        await user.deleteOne(); // En versiones recientes de Mongoose, remove() está obsoleto
        res.json({ message: 'Usuario eliminado' });
    } else {
        res.status(404);
        throw new Error('Usuario no encontrado');
    }
    });