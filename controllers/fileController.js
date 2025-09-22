import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';
import https from 'https';

export const streamFile = async (req, res) => {
    try {
        const { url, mimeType, fileName } = req.query;
        
        if (!url) {
            return res.status(400).send('URL no proporcionada');
        }

        // Hacer una solicitud GET al archivo en Cloudinary
        https.get(url, (response) => {
            // Configurar headers según el tipo de archivo
            if (mimeType) {
                res.setHeader('Content-Type', mimeType);
            }
            
            // Usar el nombre del archivo original si está disponible
            const disposition = `inline; filename="${fileName || 'documento'}"`;
            res.setHeader('Content-Disposition', disposition);
            
            // Permitir que el navegador almacene en caché el archivo
            res.setHeader('Cache-Control', 'public, max-age=3600');
            
            // Transmitir el archivo directamente al cliente
            response.pipe(res);
        }).on('error', (err) => {
            console.error('Error al obtener el archivo:', err);
            res.status(500).send('Error al obtener el archivo');
        });
    } catch (error) {
        console.error('Error en streamFile:', error);
        res.status(500).send('Error interno del servidor');
    }
};

export const downloadFile = async (req, res) => {
    try {
        const { url, fileName, mimeType } = req.query;
        
        if (!url) {
            return res.status(400).send('URL no proporcionada');
        }

        // Hacer una solicitud GET al archivo en Cloudinary
        https.get(url, (response) => {
            // Configurar headers para descarga
            if (mimeType) {
                res.setHeader('Content-Type', mimeType);
            }
            
            // Configurar para descarga con nombre personalizado
            const disposition = `attachment; filename="${fileName || 'documento'}"`;
            res.setHeader('Content-Disposition', disposition);
            
            // Configurar headers adicionales para descarga
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            
            // Transmitir el archivo directamente al cliente
            response.pipe(res);
        }).on('error', (err) => {
            console.error('Error al obtener el archivo para descarga:', err);
            res.status(500).send('Error al obtener el archivo');
        });
    } catch (error) {
        console.error('Error en downloadFile:', error);
        res.status(500).send('Error interno del servidor');
    }
};
