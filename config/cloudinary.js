import { v2 as cloudinary } from 'cloudinary';

// Configuración básica de Cloudinary
cloudinary.config({
    cloud_name: 'dzrstenqb',
    api_key: '398629673296979',
    api_secret: 'Nq6PFaae1I72AmaZzCUbE2dPdjo',
    secure: true,
    timeout: 300000, // 5 minutos de timeout
    upload_timeout: 300000 // 5 minutos de timeout para subidas
});

// Configurar acceso público para recursos raw
const configureCloudinary = async () => {
    try {
        // Crear las carpetas si no existen
        await cloudinary.api.create_folder('evidencias').catch(() => {});
        await cloudinary.api.create_folder('perfiles').catch(() => {});
        
        // Crear imagen por defecto si no existe
        try {
            await cloudinary.api.resource('perfiles/default_profile');
            console.log('✅ Imagen por defecto ya existe');
        } catch (error) {
            if (error.error?.http_code === 404) {
                // Crear una imagen por defecto usando un placeholder
                await cloudinary.uploader.upload(
                    'https://via.placeholder.com/400x400/6366f1/ffffff?text=Usuario',
                    {
                        folder: 'perfiles',
                        public_id: 'default_profile',
                        overwrite: true,
                        tags: ['perfiles', 'default']
                    }
                );
                console.log('✅ Imagen por defecto creada');
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

// Ejecutar configuración
configureCloudinary();

export { cloudinary as default, generateCloudinaryUrls };
