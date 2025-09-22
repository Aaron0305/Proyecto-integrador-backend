import mongoose from 'mongoose';
import Assignment from './Assignment.js';

const teacherStatsSchema = new mongoose.Schema({
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    stats: {
        completed: {
            type: Number,
            default: 0
        },
        pending: {
            type: Number,
            default: 0
        },
        overdue: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            default: 0
        }
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// Método estático para actualizar las estadísticas de un profesor
teacherStatsSchema.statics.updateTeacherStats = async function(teacherId) {
    const now = new Date();
    
    // Obtener todas las asignaciones del profesor
    const assignments = await Assignment.find({
        assignedTo: teacherId
    });

    // Calcular estadísticas
    const stats = {
        total: assignments.length,
        completed: assignments.filter(a => a.status === 'completed').length,
        pending: assignments.filter(a => 
            a.status === 'pending' && new Date(a.dueDate) > now
        ).length,
        overdue: assignments.filter(a => 
            a.status === 'pending' && new Date(a.dueDate) <= now
        ).length
    };

    // Actualizar o crear el documento de estadísticas
    const teacherStats = await this.findOneAndUpdate(
        { teacher: teacherId },
        { 
            $set: {
                stats: stats,
                lastUpdated: now
            }
        },
        { 
            new: true,
            upsert: true
        }
    );

    return teacherStats;
};

export default mongoose.model('TeacherStats', teacherStatsSchema); 