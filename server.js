import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/users.js';
import userRegistrosRouter from './routes/userRegistros.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import dailyRecordRoutes from './routes/dailyRecordRoutes.js';
import carrerasRoutes from './routes/carreras.js';
import semestresRoutes from './routes/semestres.js';
import statsRoutes from './routes/statsRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import notificationService from './services/notificationService.js';
import { startScheduledAssignmentsCron } from './services/scheduledAssignmentsService.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Inicializar servicio de notificaciones
notificationService.initialize(httpServer);

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://frontend-opal-omega-97.vercel.app',
        'https://frontend-au8plvs1h-aaronns-projects-f412b7c5.vercel.app',
        'https://frontend-aaronns-projects-f412b7c5.vercel.app',
        'https://frontend-git-main-aaronns-projects-f412b7c5.vercel.app'
    ],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Backend API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            users: '/api/users',
            assignments: '/api/assignments',
            dailyRecords: '/api/daily-records',
            files: '/api/files'
        }
    });
});

// Favicon endpoints to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // No content
});

app.get('/favicon.png', (req, res) => {
    res.status(204).end(); // No content
});

// Rutas estáticas - Comentado porque usamos Cloudinary
// app.use('/uploads', express.static('uploads'));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users', userRegistrosRouter);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/daily-records', dailyRecordRoutes);
app.use('/api/carreras', carrerasRoutes);
app.use('/api/semestres', semestresRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/files', fileRoutes);

// Manejador de errores
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

// Conectar a la base de datos
connectDB().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
        console.log('✅ Configurado para usar Cloudinary en lugar de almacenamiento local');
        
        // Iniciar el servicio de asignaciones programadas
        setTimeout(() => {
            try {
                startScheduledAssignmentsCron();
                console.log('✅ Servicio de asignaciones programadas iniciado');
            } catch (error) {
                console.error('⚠️ Error al iniciar asignaciones programadas:', error.message);
            }
        }, 5000); // Esperar 5 segundos después de que el servidor esté listo
    });
}).catch(err => {
    console.error('Error al conectar a la base de datos:', err);
    process.exit(1);
});