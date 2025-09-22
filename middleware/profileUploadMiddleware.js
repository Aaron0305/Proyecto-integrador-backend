import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import path from 'path';

// Configuración de almacenamiento en memoria para Cloudinary
const storage = multer.memoryStorage();

// Función para subir imagen de perfil a Cloudinary
const uploadProfileToCloudinary = (buffer, fileInfo, numeroControl) => {
    return new Promise((resolve, reject) => {
        // Sanitizar el nombre del archivo
        const sanitizedName = fileInfo.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueSuffix = Date.now();
        const finalFileName = `${numeroControl}_${uniqueSuffix}_${sanitizedName}`;

        const options = {
            folder: 'perfiles', // Carpeta específica para perfiles en Cloudinary
            resource_type: 'image',
            public_id: `${numeroControl}_${uniqueSuffix}`,
            type: 'upload',
            format: path.parse(finalFileName).ext.substring(1),
            overwrite: true,
            use_filename: true,
            unique_filename: true,
            access_mode: 'public',
            tags: ['perfiles'],
            transformation: [
                { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                { quality: 'auto', fetch_format: 'auto' }
            ]
        };

        console.log('🔧 Subiendo imagen de perfil a Cloudinary:', options);
        
        // Convertir el buffer a base64
        const base64Data = buffer.toString('base64');
        
        cloudinary.uploader.upload(
            `data:${fileInfo.mimetype};base64,${base64Data}`,
            options,
            (error, result) => {
                if (error) {
                    console.error('❌ Error subiendo imagen de perfil a Cloudinary:', error);
                    return reject(error);
                }

                console.log('✅ Imagen de perfil subida a Cloudinary:', {
                    public_id: result.public_id,
                    secure_url: result.secure_url,
                    format: result.format,
                    bytes: result.bytes
                });

                resolve(result);
            }
        );
    });
};

const fileFilter = (req, file, cb) => {
    // Solo permitir imágenes
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos de imagen'), false);
    }
};

// Configuración de multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo para fotos de perfil
    },
    fileFilter: fileFilter
}).single('fotoPerfil');

// Middleware personalizado que maneja la subida a Cloudinary
export const uploadProfile = (req, res, next) => {
    upload(req, res, async (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: 'La imagen es demasiado grande. El tamaño máximo permitido es 5MB.'
                    });
                }
            }
            return res.status(400).json({
                success: false,
                message: err.message || 'Error al subir la imagen'
            });
        }

        // Si no hay archivo, continuar
        if (!req.file) {
            return next();
        }

        try {
            const numeroControl = req.body.numeroControl || 'temp';
            const result = await uploadProfileToCloudinary(req.file.buffer, req.file, numeroControl);
            
            // Guardar la URL de Cloudinary en lugar del nombre del archivo
            req.file.cloudinaryUrl = result.secure_url;
            req.file.publicId = result.public_id;
            
            console.log('✅ Imagen de perfil procesada:', {
                originalName: req.file.originalname,
                cloudinaryUrl: req.file.cloudinaryUrl,
                publicId: req.file.publicId
            });
            
            next();
        } catch (error) {
            console.error('❌ Error procesando imagen de perfil:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al procesar la imagen de perfil'
            });
        }
    });
};
