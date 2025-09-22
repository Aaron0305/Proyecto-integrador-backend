import mongoose from 'mongoose';

const carreraSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true
  },
  activo: {
    type: Boolean,
    default: true
  }
});

const Carrera = mongoose.model('Carrera', carreraSchema);

// Función para inicializar carreras automáticamente
async function initCarreras() {
  try {
    const count = await Carrera.countDocuments();
    if (count === 0) {
      const carrerasIniciales = [
        "INGENIERÍA ELECTROMECÁNICA",
        "INGENIERÍA EN LOGÍSTICA",
        "INGENIERÍA INDUSTRIAL",
        "INGENIERÍA EN GESTIÓN EMPRESARIAL",
        "INGENIERÍA QUÍMICA",
        "INGENIERÍA EN SISTEMAS COMPUTACIONALES",
        "ARQUITECTURA",
        "INGENIERÍA EN ANIMACIÓN Y EFECTOS VISUALES",
        "INGENIERÍA MECATRÓNICA",
        "LICENCIATURA EN TURISMO",
        "CONTADOR PÚBLICO",
        "INGENIERÍA EN MATERIALES"
      ];

      await Carrera.insertMany(
        carrerasIniciales.map(nombre => ({ nombre }))
      );
      console.log('✅ Carreras inicializadas correctamente');
    }
  } catch (error) {
    console.error('Error al inicializar carreras:', error);
  }
}

// Ejecutar cuando se importa el modelo
initCarreras();

export default Carrera;
