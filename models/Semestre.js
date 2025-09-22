import mongoose from 'mongoose';

const semestreSchema = new mongoose.Schema({
    numero: {
        type: Number,
        required: true,
        min: 1,
        max: 9,
        unique: true
    },
    descripcion: {
        type: String,
        required: true
    }
});

export default mongoose.model('Semestre', semestreSchema);
