import cron from 'node-cron';
import { publishScheduledAssignments } from '../controllers/assignmentController.js';

// Configurar el cron job para ejecutarse cada 5 minutos
// Esto verificará si hay asignaciones programadas que deben ser publicadas
const scheduledAssignmentsCron = cron.schedule('*/5 * * * *', async () => {
    console.log('🔄 Ejecutando verificación de asignaciones programadas...');
    
    try {
        const result = await publishScheduledAssignments();
        
        if (result.success) {
            if (result.publishedCount > 0) {
                console.log(`✅ Se publicaron ${result.publishedCount} asignaciones programadas`);
            } else {
                console.log('ℹ️ No hay asignaciones programadas para publicar en este momento');
            }
        } else {
            console.error('❌ Error en la verificación de asignaciones programadas:', result.error);
        }
    } catch (error) {
        console.error('❌ Error ejecutando cron job de asignaciones programadas:', error);
    }
}, {
    scheduled: false, // No iniciar automáticamente
    timezone: "America/Mexico_City" // Timezone de México
});

// Función para iniciar el cron job
export const startScheduledAssignmentsCron = () => {
    try {
        scheduledAssignmentsCron.start();
        console.log('🚀 Cron job de asignaciones programadas iniciado - Se ejecuta cada 5 minutos');
    } catch (error) {
        console.error('❌ Error iniciando cron job de asignaciones programadas:', error);
    }
};

// Función para detener el cron job
export const stopScheduledAssignmentsCron = () => {
    try {
        scheduledAssignmentsCron.stop();
        console.log('⏹️ Cron job de asignaciones programadas detenido');
    } catch (error) {
        console.error('❌ Error deteniendo cron job de asignaciones programadas:', error);
    }
};

// Función para verificar el estado del cron job
export const getScheduledAssignmentsCronStatus = () => {
    return {
        running: scheduledAssignmentsCron.getStatus() === 'scheduled',
        nextExecution: scheduledAssignmentsCron.nextDates(1)
    };
};

// Función para ejecutar manualmente la verificación (útil para testing)
export const runScheduledAssignmentsCheck = async () => {
    console.log('🔧 Ejecutando verificación manual de asignaciones programadas...');
    
    try {
        const result = await publishScheduledAssignments();
        console.log('📊 Resultado de verificación manual:', result);
        return result;
    } catch (error) {
        console.error('❌ Error en verificación manual:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

export default {
    startScheduledAssignmentsCron,
    stopScheduledAssignmentsCron,
    getScheduledAssignmentsCronStatus,
    runScheduledAssignmentsCheck
};
