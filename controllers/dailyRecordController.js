import DailyRecord from '../models/DailyRecord.js';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';

// Configuración de multer para Cloudinary - usar memoria en lugar de disco
const storage = multer.memoryStorage();

export const upload = multer({ storage: storage });

// Crear nuevo registro
export const createRecord = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }    const {
      fecha,
      horaEntrada,
      horaSalida,
      horasRealizadas,
      titulo,
      descripcion,
      observaciones
    } = req.body;

    if (!fecha || !horaEntrada || !horaSalida || !horasRealizadas || !titulo || !descripcion) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    // Las observaciones son opcionales, así que no se incluyen en la validación

    // Procesar archivos subidos a Cloudinary
    let evidencias = [];
    if (req.files && req.files.length > 0) {
      try {
        const uploadPromises = req.files.map(async (file) => {
          const base64Data = file.buffer.toString('base64');
          const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload(
              `data:${file.mimetype};base64,${base64Data}`,
              {
                folder: 'evidencias',
                resource_type: 'auto',
                public_id: `${Date.now()}_${file.originalname.split('.')[0]}`,
                overwrite: true,
                use_filename: true,
                unique_filename: true
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
          });

          return {
            nombre: file.originalname,
            url: uploadResult.secure_url,
            tipo: file.mimetype,
            cloudinaryId: uploadResult.public_id
          };
        });

        evidencias = await Promise.all(uploadPromises);
      } catch (uploadError) {
        console.error('Error al subir archivos a Cloudinary:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Error al subir los archivos'
        });
      }
    }    const nuevoRegistro = new DailyRecord({
      usuario: req.user._id,
      fecha: new Date(fecha),
      horaEntrada,
      horaSalida,
      horasRealizadas: parseFloat(horasRealizadas),
      titulo,
      descripcion,
      observaciones: observaciones || '', // Si no se proporciona, se usa cadena vacía
      evidencias
    });

    await nuevoRegistro.save();

    res.status(201).json({
      success: true,
      message: 'Registro creado exitosamente',
      data: nuevoRegistro
    });

  } catch (error) {
    console.error('Error al crear registro:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un registro para esta fecha'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear el registro',
      error: error.message
    });
  }
};

// Obtener registros por usuario
export const getRecordsByUser = async (req, res) => {
  try {
    const registros = await DailyRecord.find({ usuario: req.user._id })
      .populate('usuario', 'nombre apellidoPaterno')
      .sort({ fecha: -1 });

    res.json({
      success: true,
      data: registros
    });

  } catch (error) {
    console.error('Error al obtener registros:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los registros',
      error: error.message
    });
  }
};

// Obtener registro por fecha
export const getRecordByDate = async (req, res) => {
  try {
    const { fecha } = req.params;
    const registro = await DailyRecord.findOne({
      usuario: req.user._id,
      fecha: new Date(fecha)
    });
    if (registro) {
      res.json(registro);
    } else {
      res.status(404).json({ message: 'Registro no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
