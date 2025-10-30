// Load environment variables as early as possible
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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


const app = express();

// We'll manage DB connection and server startup depending on environment:
// - In serverless (Vercel) we export a handler and DO NOT call listen()
// - Locally (node server.js) we start an http server and socket/cron services

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://proyecto-integrador-frontend-nu.vercel.app',
        'https://proyecto-integrador-backend-six.vercel.app'
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

// Ensure DB connection happens once per cold start
let _dbConnected = false;
const ensureDbConnected = async () => {
    if (_dbConnected) return;
    await connectDB();
    _dbConnected = true;
};

// Function to start long-running pieces when running locally (not serverless)
const startLongRunningServices = async () => {
    // Only start HTTP server / socket / cron when running as a standalone server
    const isServerless = !!process.env.VERCEL || process.env.NODE_ENV === 'production' && !process.env.PORT;
    if (isServerless) {
        console.log('ℹ️ Running in serverless mode — will not start http server, sockets or cron jobs');
        return;
    }

    // Start HTTP server and notification service
    const httpServer = createServer(app);
    notificationService.initialize(httpServer);

    httpServer.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
        console.log('✅ Configurado para usar Cloudinary en lugar de almacenamiento local');
    });

    // Start scheduled assignments cron after a short delay
    setTimeout(() => {
        try {
            startScheduledAssignmentsCron();
            console.log('✅ Servicio de asignaciones programadas iniciado');
        } catch (error) {
            console.error('⚠️ Error al iniciar asignaciones programadas:', error.message);
        }
    }, 5000);
};

// Exported handler for serverless platforms like Vercel
export default async function handler(req, res) {
    try {
        await ensureDbConnected();
        // In serverless mode we simply let Express handle the request
        return app(req, res);
    } catch (error) {
        console.error('Error handling request in serverless handler:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

// If this file is run directly (node server.js), connect DB and start services
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
    ensureDbConnected().then(() => startLongRunningServices()).catch(err => {
        console.error('Error al conectar a la base de datos al iniciar localmente:', err);
        process.exit(1);
    });
}