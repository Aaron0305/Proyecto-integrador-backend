import { v2 as cloudinary } from 'cloudinary';

// Configuración básica de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
    timeout: 300000, // 5 minutos de timeout
    upload_timeout: 300000 // 5 minutos de timeout para subidas
});

// Configurar acceso público para recursos raw
const configureCloudinary = async () => {
    try {
        // Verificar que las credenciales estén presentes
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            console.warn('⚠️ Cloudinary credentials missing. Skipping Cloudinary initialization.');
            return;
        }

        // Crear las carpetas si no existen (ignorar errores)
        await cloudinary.api.create_folder('evidencias').catch(() => {});
        await cloudinary.api.create_folder('perfiles').catch(() => {});

        // Crear imagen por defecto si no existe. Evitamos dependencias externas (via.placeholder.com)
        try {
            await cloudinary.api.resource('perfiles/default_profile');
            console.log('✅ Imagen por defecto ya existe');
        } catch (error) {
            // Si no existe, crear una imagen simple generada localmente (SVG) y subirla como data URI
            const notFound = (error && (error.error?.http_code === 404 || error.http_code === 404 || error.statusCode === 404));
            if (notFound) {
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="#6366f1"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="40" fill="#ffffff" font-family="Arial, Helvetica, sans-serif">Usuario</text></svg>`;
                // Use base64-encoded data URI to avoid issues with percent-encoding and Windows path handling
                const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
                try {
                    await cloudinary.uploader.upload(
                        dataUri,
                        {
                            folder: 'perfiles',
                            public_id: 'default_profile',
                            overwrite: true,
                            tags: ['perfiles', 'default']
                        }
                    );
                    console.log('✅ Imagen por defecto creada (SVG)');
                } catch (uploadErr) {
                    console.warn('⚠️ No se pudo crear la imagen por defecto en Cloudinary:', uploadErr.message || uploadErr);
                }
            } else {
                console.warn('⚠️ Aviso de configuración de Cloudinary (resource check):', error.message || error);
            }
        }
        
        // Configurar acceso público para archivos raw
        await cloudinary.api.update_resources_access_mode_by_tag(
            'public',
            'evidencias',
            { resource_type: 'raw' }
        );

        // Configurar transformaciones predeterminadas para PDFs
        cloudinary.config({
            secure: true,
            transformation: {
                flags: "attachment",
                format: "pdf",
                quality: "auto"
            }
        });

        console.log('✅ Configuración de Cloudinary completada');
    } catch (error) {
        console.error('⚠️ Aviso de configuración de Cloudinary:', error.message);
    }
};

// Función para generar URLs optimizadas
const generateCloudinaryUrls = (result, fileInfo) => {
    let baseUrl = result.secure_url;
    
    // Para PDFs y otros documentos
    if (fileInfo.mimetype === 'application/pdf') {
        // URL específica para PDFs con parámetros de visualización
        baseUrl = baseUrl.replace('/upload/', '/upload/fl_attachment:false/');
        const viewUrl = `${baseUrl}#view=FitH&toolbar=0&navpanes=0`;
        return {
            viewUrl: viewUrl.replace('http://', 'https://'),
            displayName: fileInfo.originalname
        };
    } else if (!fileInfo.mimetype.startsWith('image/')) {
        // Otros documentos que no son imágenes
        baseUrl = baseUrl.replace('/image/upload/', '/raw/upload/');
    }

    // URL para visualización en línea (sin descarga)
    const viewUrl = baseUrl.replace('/upload/', '/upload/fl_attachment:false/');
    
    return {
        viewUrl: viewUrl.replace('http://', 'https://'),
        displayName: fileInfo.originalname
    };
};

// Ejecutar configuración solo cuando no estemos en un entorno serverless
const shouldInitCloudinary = process.env.SKIP_CLOUDINARY_INIT !== 'true' && !process.env.VERCEL;
if (shouldInitCloudinary) {
    configureCloudinary();
} else {
    console.log('ℹ️ Skipping Cloudinary initialization (serverless or SKIP_CLOUDINARY_INIT=true)');
}

export { cloudinary as default, generateCloudinaryUrls };
