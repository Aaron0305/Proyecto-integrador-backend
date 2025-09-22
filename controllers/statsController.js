import Assignment from '../models/Assignment.js';
import User from '../models/User.js';

export const getTeacherStats = async (req, res) => {
    console.log('Iniciando getTeacherStats');
    try {
        // 1. Obtener todos los docentes
        const teachers = await User.find({ role: 'docente' });
        console.log(`Encontrados ${teachers.length} docentes`);

        // 2. Obtener todas las asignaciones
        const assignments = await Assignment.find();
        console.log(`Encontradas ${assignments.length} asignaciones`);

        // 3. Calcular estadísticas para cada docente
        const stats = [];
        const now = new Date();

        for (const teacher of teachers) {
            // Filtrar asignaciones del profesor
            const teacherAssignments = assignments.filter(assignment => {
                const isCreator = assignment.createdBy?.toString() === teacher._id.toString();
                const isAssigned = assignment.assignedTo?.includes(teacher._id.toString());
                return isCreator || isAssigned;
            });

            // Calcular estadísticas
            const teacherStats = {
                teacherId: teacher.numeroControl,
                teacherName: `${teacher.nombre} ${teacher.apellidoPaterno || ''} ${teacher.apellidoMaterno || ''}`.trim(),
                email: teacher.email,
                total: teacherAssignments.length,
                completed: teacherAssignments.filter(a => a.status === 'completed').length,
                pending: teacherAssignments.filter(a => 
                    a.status === 'pending' && new Date(a.dueDate) > now
                ).length,
                overdue: teacherAssignments.filter(a => 
                    a.status === 'pending' && new Date(a.dueDate) <= now
                ).length
            };

            console.log(`Estadísticas para ${teacherStats.teacherName}:`, teacherStats);
            stats.push(teacherStats);
        }

        return res.json(stats);
    } catch (error) {
        console.error('Error en getTeacherStats:', error);
        return res.status(500).json({ 
            message: 'Error al obtener estadísticas',
            error: error.message 
        });
    }
}; 