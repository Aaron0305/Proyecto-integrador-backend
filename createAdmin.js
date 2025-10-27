import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Carrera from './models/Carrera.js';
dotenv.config();

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/proyecto_integrador', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  // Buscar una carrera existente
  const carrera = await Carrera.findOne();
  if (!carrera) {
    console.error('No hay carreras registradas.');
    process.exit(1);
  }

  const email = 'admin@admin.com';
  const numeroControl = 'ADMIN001';
  const nombre = 'Administrador';
  const apellidoPaterno = 'Principal';
  const apellidoMaterno = 'Sistema';
  const password = await bcrypt.hash('1234567890', 10);

  // Verificar si ya existe
  const exists = await User.findOne({ email });
  if (exists) {
    console.log('El usuario administrador ya existe.');
    process.exit(0);
  }

  const admin = new User({
    email,
    numeroControl,
    nombre,
    apellidoPaterno,
    apellidoMaterno,
    carrera: carrera._id,
    semestre: 1,
    password,
    role: 'admin'
  });
  await admin.save();
  console.log('Usuario administrador creado:');
  console.log('Email:', email);
  console.log('Contraseña:', '1234567890');
  mongoose.disconnect();
}

createAdmin();
