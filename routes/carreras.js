import express from 'express';
import Carrera from '../models/Carrera.js';

const router = express.Router();

// Obtener todas las carreras
router.get('/', async (req, res) => {
  try {
    const carreras = await Carrera.find({ activo: true });
    console.log('Carreras mostradas correctamente');
    res.json(carreras);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener carreras' });
  }
});

// Ruta para inicializar las carreras
router.post('/init', async (req, res) => {
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

  try {
    const carreras = await Carrera.insertMany(
      carrerasIniciales.map(nombre => ({ nombre }))
    );
    res.json(carreras);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
