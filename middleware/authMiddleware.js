    // middleware/authMiddleware.js
    import jwt from 'jsonwebtoken';
    import dotenv from 'dotenv';

    dotenv.config();

    export const verifyToken = (req, res, next) => {
        console.log('Verificando token...');
        
        // Obtener token del header
        const authHeader = req.headers.authorization;
        console.log('Auth Header:', authHeader);
        
        // Verificar si no hay token
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('No se encontró token válido');
            return res.status(401).json({ message: 'No hay token de autorización' });
        }

        try {
            // Verificar token
            const token = authHeader.split(' ')[1];
            console.log('Token extraído:', token.substring(0, 10) + '...');
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_seguro');
            console.log('Token decodificado:', decoded);
            
            // Agregar usuario al request
            req.user = decoded;
            next();
        } catch (error) {
            console.error('Error al verificar token:', error);
            res.status(401).json({ message: 'Token inválido' });
        }
    };

    export const isAdmin = (req, res, next) => {
        console.log('Verificando rol admin...');
        console.log('Usuario:', req.user);
        
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado: Se requieren privilegios de administrador' });
        }
        next();
    };

    export const isDocente = (req, res, next) => {
        console.log('Verificando rol docente...');
        console.log('Usuario:', req.user);
        
        if (!req.user || (req.user.role !== 'docente' && req.user.role !== 'admin')) {
            return res.status(403).json({ message: 'Acceso denegado: Se requieren privilegios de docente' });
        }
        next();
    };

    export const authorize = (...roles) => {
        return (req, res, next) => {
            console.log('Verificando roles:', roles);
            console.log('Usuario:', req.user);
            
            if (!req.user || !roles.includes(req.user.role)) {
                return res.status(403).json({ 
                    message: `Acceso denegado: Se requiere rol ${roles.join('/')}` 
                });
            }
            next();
        };
    };