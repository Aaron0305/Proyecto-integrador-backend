import mongoose from 'mongoose';

const dailyRecordSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fecha: {
    type: Date,
    required: true
  },
  horaEntrada: {
    type: String,
    required: true
  },
  horaSalida: {
    type: String,
    required: true
  },
  horasRealizadas: {
    type: Number,
    required: true
  },
  descripcion: {
    type: String,
    required: true
  },
  titulo: {
    type: String,
    required: true
  },
  observaciones: {
    type: String,
    required: false,
    default: ''  // valor por defecto vacío
  },
  evidencias: [{
    nombre: String,
    url: String,
    tipo: String,
    ruta: String
  }]
}, {
  timestamps: true
});

// Agregar índices compuestos para evitar registros duplicados del mismo usuario en la misma fecha
dailyRecordSchema.index({ usuario: 1, fecha: 1 }, { 
  unique: true, 
  background: true,
  sparse: true,
  name: 'usuario_fecha_unique'
});

// Función para manejar índices de forma segura
const handleDailyRecordIndexes = async () => {
  try {
    const collection = mongoose.connection.collection('dailyrecords');
    
    // Eliminar índices existentes de forma segura
    try {
      await collection.dropIndexes();
      console.log('Índices DailyRecord anteriores eliminados');
    } catch (dropError) {
      console.log('Aviso: No se pudieron eliminar índices DailyRecord anteriores');
    }

    await collection.createIndex(
      { usuario: 1, fecha: 1 },
      { 
        unique: true,
        background: true,
        name: 'usuario_fecha_unique',
        sparse: true
      }
    );

    console.log('Índices de DailyRecord creados correctamente');
  } catch (error) {
    console.log('Error al manejar índices DailyRecord:', error.message);
    // No lanzar el error, solo registrarlo
  }
};

// Modificar el evento connected para ejecutarse después de User
mongoose.connection.once('connected', () => {
  setTimeout(() => {
    handleDailyRecordIndexes();
  }, 2000); // Se ejecuta después de los índices de User
});

const DailyRecord = mongoose.model('DailyRecord', dailyRecordSchema);
export default DailyRecord;
