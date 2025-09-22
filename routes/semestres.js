import express from 'express';
import Semestre from '../models/Semestre.js';

const router = express.Router();

// Obtener todos los semestres
router.get('/', async (req, res) => {
    try {
        const semestres = await Semestre.find().sort({ numero: 1 });
        res.json(semestres);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Script para inicializar semestres si no existen
router.post('/init', async (req, res) => {
    try {
        const count = await Semestre.countDocuments();
        if (count === 0) {
            const semestres = [];
            for (let i = 1; i <= 9; i++) {
                semestres.push({
                    numero: i,
                    descripcion: `${i}º Semestre`
                });
            }
            await Semestre.insertMany(semestres);
            res.json({ message: 'Semestres inicializados correctamente' });
        } else {
            res.json({ message: 'Los semestres ya están inicializados' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
