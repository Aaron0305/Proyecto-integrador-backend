import express from 'express';
const router = express.Router();
import { auth } from '../middleware/auth.js';
import { upload, handleMulterError, uploadToCloud } from '../middleware/uploadMiddleware.js';
import {
    createAssignment,
    getAllAssignments,
    getUserAssignments,
    getUserDashboardStats,
    getAssignmentById,
    getFilteredAssignments,
    submitAssignmentResponse,
    updateAssignmentStatus,
    getTeacherAssignmentStats,
    getTeacherFilteredAssignments,
    markAssignmentCompleted,
    // Nuevas funciones para administrador
    getAdminAllAssignments,
    getAdminAssignmentStats,
    markAssignmentCompletedByAdmin,
    updateAssignmentByAdmin,
    updateTeacherAssignmentStatus,
    // Funciones para asignaciones programadas
    scheduleAssignment,
    getScheduledAssignments,
    cancelScheduledAssignment,
    updateScheduledAssignment,
    publishScheduledAssignments,
    // Nuevas funciones para gestión de estados de docentes
    getTeachersStatusForAssignment,
    updateTeacherStatusInAssignment,
    getAssignmentsByTeacherId
} from '../controllers/assignmentController.js';

// Rutas para administradores
router.post('/', 
    auth, 
    upload.array('attachments', 5),
    handleMulterError,
    uploadToCloud,
    createAssignment
);

// Rutas específicas para administrador
router.get('/admin/all', auth, getAdminAllAssignments);
router.get('/admin/stats', auth, getAdminAssignmentStats);
router.patch('/admin/:assignmentId/complete', auth, markAssignmentCompletedByAdmin);
router.put('/admin/:assignmentId', auth, updateAssignmentByAdmin);
router.patch('/admin/:assignmentId/teacher-status', auth, updateTeacherAssignmentStatus);

// Rutas para asignaciones programadas
router.post('/admin/schedule', auth, scheduleAssignment);
router.get('/admin/scheduled', auth, getScheduledAssignments);
router.delete('/admin/scheduled/:id', auth, cancelScheduledAssignment);
router.put('/admin/scheduled/:id', auth, updateScheduledAssignment);
router.post('/admin/publish-scheduled', auth, async (req, res) => {
    try {
        await publishScheduledAssignments();
        res.json({ success: true, message: 'Asignaciones programadas procesadas' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Ruta temporal sin autenticación para pruebas
router.post('/test', 
    upload.array('attachments', 5),
    handleMulterError,
    async (req, res) => {
        try {
            // Simular usuario admin para la prueba
            req.user = { _id: '686adb66894909cadb9449bf' };
            await createAssignment(req, res);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

router.get('/all', auth, getAllAssignments);
router.patch('/:id/status', auth, updateAssignmentStatus);

// Rutas para docentes
// Endpoint para admin: obtener asignaciones de cualquier docente por su teacherId
router.get('/admin/teacher/:teacherId/assignments', auth, getAssignmentsByTeacherId);
router.get('/my-assignments', auth, getUserAssignments);
router.get('/dashboard-stats', auth, getUserDashboardStats);
router.get('/filtered', auth, getFilteredAssignments);

// Nuevas rutas específicas para docentes
router.get('/teacher/stats', auth, getTeacherAssignmentStats);
router.get('/teacher/assignments', auth, getTeacherFilteredAssignments);
router.patch('/teacher/:id/complete', auth, markAssignmentCompleted);

// Endpoint para verificar el estado de autenticación desde frontend
router.get('/auth-status', (req, res) => {
    console.log('🔍 === AUTH STATUS CHECK ===');
    console.log('Headers recibidos:', req.headers);
    console.log('Authorization header:', req.headers.authorization);
    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.log('❌ No hay header de autorización');
        return res.status(401).json({
            success: false,
            message: 'No hay token de autorización',
            hasAuth: false
        });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
        console.log('❌ Formato de autorización incorrecto');
        return res.status(401).json({
            success: false,
            message: 'Formato de autorización incorrecto',
            hasAuth: true,
            authFormat: authHeader.substring(0, 20) + '...'
        });
    }
    
    const token = authHeader.split(' ')[1];
    console.log('✅ Token encontrado:', token ? 'Sí' : 'No');
    
    res.json({
        success: true,
        message: 'Token presente y con formato correcto',
        hasAuth: true,
        tokenLength: token ? token.length : 0
    });
});

router.get('/:id', auth, getAssignmentById);
router.post('/:id/submit', 
    auth, 
    upload.array('files', 5),
    handleMulterError,
    uploadToCloud,
    submitAssignmentResponse
);

// Endpoint de debug para verificar headers
router.post('/debug-headers', (req, res) => {
    console.log('🔍 === DEBUG HEADERS ===');
    console.log('Headers:', req.headers);
    console.log('Authorization:', req.headers.authorization);
    console.log('Body:', req.body);
    
    res.json({
        success: true,
        message: 'Headers recibidos',
        headers: req.headers,
        hasAuth: !!req.headers.authorization,
        authHeader: req.headers.authorization
    });
});

// Nuevas rutas para gestión de estados de docentes
router.get('/:assignmentId/teachers-status', auth, getTeachersStatusForAssignment);
router.patch('/:assignmentId/teacher-status', auth, updateTeacherStatusInAssignment);

export default router;