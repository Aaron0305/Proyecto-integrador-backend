import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'El correo es requerido'],
    lowercase: true,
    trim: true
  },
  numeroControl: {
    type: String,
    required: [true, 'El número de control es requerido'],
    trim: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  apellidoPaterno: {
    type: String,
    required: true,
    trim: true
  },
  apellidoMaterno: {
    type: String,
    trim: true
  },
  carrera: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Carrera',
    required: true
  },
  semestre: {
    type: Number,
    required: false,
    default: 1
  },
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  fotoPerfil: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['admin', 'docente'],
    default: 'docente'
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  }
});

// Función segura para manejar índices
const handleIndexes = async () => {
  try {
    const collection = mongoose.connection.collection('users');
    
    // Primero intentar eliminar índices existentes de forma segura
    try {
      await collection.dropIndexes();
      console.log('Índices anteriores eliminados correctamente');
    } catch (dropError) {
      console.log('Aviso: No se pudieron eliminar índices anteriores');
    }

    // Crear nuevos índices
    const indexPromises = [
      collection.createIndex(
        { email: 1 },
        { 
          unique: true,
          background: true,
          name: 'email_unique',
          sparse: true
        }
      ),
      collection.createIndex(
        { numeroControl: 1 },
        { 
          unique: true,
          background: true,
          name: 'numeroControl_unique',
          sparse: true
        }
      )
    ];

    await Promise.all(indexPromises);
    console.log('Índices creados correctamente');
  } catch (error) {
    console.log('Error al manejar índices:', error.message);
    // No lanzar el error, solo registrarlo
  }
};

// Modificar el evento connected para manejar mejor el timing
mongoose.connection.once('connected', () => {
  setTimeout(() => {
    handleIndexes();
  }, 1000); // Pequeño delay para asegurar que la conexión esté estable
});

const User = mongoose.model('User', userSchema);

export default User;
