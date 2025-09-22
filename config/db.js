import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Aaron:AARtre78@cluster0.ztns0jl.mongodb.net/docentes?retryWrites=true&w=majority', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true // Habilitar la creación automática de índices
    });

    console.log('Conectado a MongoDB');

  } catch (error) {
    console.error('Error de conexión:', error);
    process.exit(1);
  }
};

export default connectDB;