import { Server } from 'socket.io';

class NotificationService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'https://frontend-opal-omega-97.vercel.app',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket) => {
      console.log('🔌 Usuario conectado:', socket.id);

      // Manejar autenticación del usuario
      socket.on('authenticate', (userId) => {
        this.connectedUsers.set(userId, socket.id);
        console.log('🔑 Usuario autenticado:', userId);
      });

      // Manejar desconexión
      socket.on('disconnect', () => {
        for (const [userId, socketId] of this.connectedUsers.entries()) {
          if (socketId === socket.id) {
            this.connectedUsers.delete(userId);
            console.log('🔌 Usuario desconectado:', userId);
            break;
          }
        }
      });
    });
  }

  // Enviar notificación a usuarios específicos
  sendNotification(userIds, notification) {
    for (const userId of userIds) {
      const socketId = this.connectedUsers.get(userId.toString());
      if (socketId) {
        this.io.to(socketId).emit('notification', notification);
      }
    }
  }

  // Enviar notificación de nueva asignación
  sendNewAssignmentNotification(userIds, assignment) {
    const notification = {
      type: 'NEW_ASSIGNMENT',
      title: 'Nueva Asignación',
      message: `Se ha creado una nueva asignación: ${assignment.title}`,
      data: {
        assignmentId: assignment._id,
        title: assignment.title,
        dueDate: assignment.dueDate
      },
      timestamp: new Date()
    };

    this.sendNotification(userIds, notification);
  }
}

export default new NotificationService(); 