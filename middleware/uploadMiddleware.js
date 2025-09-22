import multer from 'multer';
import cloudinary, { generateCloudinaryUrls } from '../config/cloudinary.js';
import path from 'path';

// Configuración de almacenamiento en memoria
const storage = multer.memoryStorage();

// Función para subir a Cloudinary
const uploadToCloudinary = (buffer, folder, fileInfo) => {
    return new Promise((resolve, reject) => {
        // Sanitizar el nombre del archivo
        const sanitizedName = fileInfo.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const finalFileName = uniqueSuffix + '-' + sanitizedName;

        // Determinar el tipo de recurso
        const resourceType = fileInfo.mimetype.startsWith('image/') ? 'image' : 'raw';
        const format = path.parse(finalFileName).ext.substring(1);
        
        const options = {
            folder: folder,
            resource_type: resourceType,
            public_id: `${fileInfo.originalname.split('.')[0]}_${Date.now()}`,
            type: 'upload',
            format: format,
            overwrite: true,
            use_filename: true,
            unique_filename: true,
            pages: true,
            access_mode: 'public',
            tags: ['evidencias']
        };

        console.log('🔧 Opciones de subida:', options);
        
        // Convertir el buffer a base64
        const base64Data = buffer.toString('base64');
        
        cloudinary.uploader.upload(
            `data:${fileInfo.mimetype};base64,${base64Data}`,
            options,
            (error, result) => {
                if (error) {
                    console.error('❌ Error en uploadToCloudinary:', error);
                    return reject(error);
                }

                // Generar URLs optimizadas
                const urls = generateCloudinaryUrls(result, fileInfo);

                console.log('✅ Archivo subido a Cloudinary:', {
                    public_id: result.public_id,
                    viewUrl: urls.viewUrl,
                    downloadUrl: urls.downloadUrl,
                    format: result.format,
                    bytes: result.bytes,
                    resource_type: result.resource_type
                });

                // Agregar las URLs al resultado
                result.viewUrl = urls.viewUrl;
                result.downloadUrl = urls.downloadUrl;
                resolve(result);
            }
        );
    });
};

// Filtro de archivos - Aceptar cualquier tipo de archivo
const fileFilter = (req, file, cb) => {
    cb(null, true);
};

// Configuración de multer - Límite aumentado a 50MB
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB máximo
        files: 5 // máximo 5 archivos
    }
});

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'El archivo es demasiado grande. El tamaño máximo permitido es 50MB.'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                error: 'Demasiados archivos. El máximo permitido es 5 archivos.'
            });
        }
    }
    next(err);
};

// Middleware para subir archivo a Cloudinary
const uploadToCloud = async (req, res, next) => {
    console.log('🚀 Iniciando uploadToCloud middleware');
    if (!req.file && !req.files) {
        console.log('❌ No hay archivos para subir');
        return next();
    }

    try {
        if (req.file) {
            console.log('📤 Subiendo archivo único:', req.file.originalname);
            const result = await uploadToCloudinary(req.file.buffer, 'evidencias', req.file);
            
            // Asignar URLs y metadatos
            const fileType = req.file.originalname.split('.').pop().toLowerCase();
            
            req.file.cloudinaryUrl = result.viewUrl; // URL para visualización
            req.file.cloudinaryId = result.public_id;
            req.file.displayName = result.displayName; // Nombre para mostrar
            req.file.mimeType = req.file.mimetype;
            req.file.fileSize = req.file.size;
            req.file.fileType = fileType;

        } else if (req.files) {
            console.log('📤 Subiendo múltiples archivos:', req.files.length);
            for (const file of req.files) {
                console.log('📄 Procesando archivo:', file.originalname);
                const result = await uploadToCloudinary(file.buffer, 'evidencias', file);
                
                // Asignar URLs y metadatos
                file.cloudinaryUrl = result.viewUrl; // URL para visualización
                file.cloudinaryId = result.public_id;
                file.displayName = result.displayName; // Nombre para mostrar
                file.mimeType = file.mimetype;
                file.fileSize = file.size;
                file.fileType = file.originalname.split('.').pop().toLowerCase();
            }
        }
        next();
    } catch (error) {
        console.error('Error al subir a Cloudinary:', error);
        res.status(500).json({
            success: false,
            error: 'Error al subir el archivo a la nube'
        });
    }
};

export { upload, handleMulterError, uploadToCloud };
