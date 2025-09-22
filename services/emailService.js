import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Servicio de Email para el envío de correos electrónicos
 * Soporta múltiples proveedores: Gmail, SendGrid, AWS SES, etc.
 */
class EmailService {
  constructor() {
    this.transporter = null;
    // No inicializar inmediatamente, esperar a que se necesite
  }

  /**
   * Inicializa el transportador de email basado en las variables de entorno
   */
  initializeTransporter() {
    const emailProvider = process.env.EMAIL_PROVIDER || 'development';
    console.log('🔧 Inicializando transportador de email...');
    console.log('📧 EMAIL_PROVIDER desde .env:', emailProvider);
    console.log('📧 NODE_ENV desde .env:', process.env.NODE_ENV);

    switch (emailProvider.toLowerCase()) {
      case 'gmail':
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD, // App Password para Gmail
          },
        });
        break;

      case 'sendgrid':
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY,
          },
        });
        break;

      case 'aws-ses':
        this.transporter = nodemailer.createTransport({
          host: process.env.AWS_SES_HOST || 'email-smtp.us-east-1.amazonaws.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.AWS_SES_ACCESS_KEY,
            pass: process.env.AWS_SES_SECRET_KEY,
          },
        });
        break;

      case 'outlook':
      case 'hotmail':
        console.log('✅ Configurando transportador para Outlook...');
        this.transporter = nodemailer.createTransport({
          service: 'hotmail', // Usar servicio directo
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });
        console.log('✅ Transportador Outlook configurado');
        break;

      case 'tesjo':
      case 'institucional':
        console.log('✅ Configurando transportador para cuenta institucional TESJO...');
        this.transporter = nodemailer.createTransport({
          host: 'smtp.office365.com', // Servidor para cuentas institucionales
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
          tls: {
            ciphers: 'SSLv3'
          }
        });
        console.log('✅ Transportador institucional configurado');
        break;

      case 'smtp':
        console.log('✅ Configurando transportador SMTP para cuenta institucional...');
        console.log('📧 Host:', process.env.SMTP_HOST);
        console.log('📧 Puerto:', process.env.SMTP_PORT);
        console.log('📧 Usuario:', process.env.EMAIL_USER);
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
          tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false
          },
          // Configuración específica para Office365
          authMethod: 'LOGIN',
          pool: true,
          maxConnections: 5,
          rateDelta: 20000,
          rateLimit: 5
        });
        console.log('✅ Transportador SMTP configurado');
        break;

      case 'development':
      default:
        console.warn('⚠️ Modo de desarrollo - emails solo se mostrarán en consola');
        // Para desarrollo, usar un transportador que solo muestre logs
        this.transporter = {
          sendMail: async (mailOptions) => {
            console.log('\n📧 =====================================');
            console.log('📧 EMAIL DE DESARROLLO (No enviado)');
            console.log('📧 =====================================');
            console.log('📧 De:', mailOptions.from);
            console.log('📧 Para:', mailOptions.to);
            console.log('📧 Asunto:', mailOptions.subject);
            console.log('📧 Texto:', mailOptions.text);
            console.log('📧 =====================================\n');
            return {
              messageId: 'dev-' + Date.now(),
              accepted: [mailOptions.to]
            };
          },
          verify: async () => {
            console.log('✅ Transportador de desarrollo configurado');
            return true;
          }
        };
    }
  }

  /**
   * Asegura que el transportador esté inicializado
   */
  ensureTransporter() {
    if (!this.transporter) {
      this.initializeTransporter();
    }
  }

  /**
   * Compila un template de Handlebars con datos
   * @param {string} templateName - Nombre del template
   * @param {object} data - Datos para el template
   * @returns {string} - HTML compilado
   */
  compileTemplate(templateName, data) {
    try {
      const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
      
      // Verificar si el archivo existe
      if (!fs.existsSync(templatePath)) {
        console.warn(`⚠️ Template no encontrado: ${templatePath}`);
        return this.getDefaultTemplate(templateName, data);
      }
      
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateSource);
      return template(data);
    } catch (error) {
      console.error('❌ Error compilando template:', error);
      return this.getDefaultTemplate(templateName, data);
    }
  }

  /**
   * Template por defecto si no se encuentran los archivos .hbs
   */
  getDefaultTemplate(templateName, data) {
    if (templateName === 'password-reset') {
      return `
<!DOCTYPE html>
<html>
<head><title>Recuperación de Contraseña</title></head>
<body>
  <h2>Recuperación de Contraseña</h2>
  <p>Hola ${data.userName},</p>
  <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
  <a href="${data.resetUrl}">Restablecer Contraseña</a>
  <p>Este enlace expirará en ${data.expirationTime}.</p>
  <p>Si no solicitaste esto, puedes ignorar este correo.</p>
</body>
</html>
      `;
    } else if (templateName === 'password-changed') {
      return `
<!DOCTYPE html>
<html>
<head><title>Contraseña Actualizada</title></head>
<body>
  <h2>Contraseña Actualizada</h2>
  <p>Hola ${data.userName},</p>
  <p>Tu contraseña ha sido actualizada exitosamente el ${data.changeDate}.</p>
  <p>Si no fuiste tú, contacta inmediatamente a soporte.</p>
</body>
</html>
      `;
    }
    return '<p>Error: Template no disponible</p>';
  }

  /**
   * Envía un email de recuperación de contraseña
   * @param {string} email - Email del destinatario
   * @param {string} resetToken - Token de recuperación
   * @param {object} user - Datos del usuario
   */
  async sendPasswordResetEmail(email, resetToken, user) {
    try {
      this.ensureTransporter(); // Asegurar que el transportador esté inicializado
      const resetUrl = `https://frontend-opal-omega-97.vercel.app/reset-password?token=${resetToken}`;
      
      const templateData = {
        userName: `${user.nombre} ${user.apellidoPaterno}`,
        resetUrl,
        expirationTime: '1 hora',
        supportEmail: process.env.SUPPORT_EMAIL || 'soporte@sistema.com',
        companyName: process.env.COMPANY_NAME || 'Sistema de Seguimiento de Docentes',
        currentYear: new Date().getFullYear()
      };

      const htmlContent = this.compileTemplate('password-reset', templateData);

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Sistema de Seguimiento',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER
        },
        to: email,
        subject: 'Recuperación de Contraseña - Sistema de Seguimiento',
        html: htmlContent,
        text: `
Hola ${templateData.userName},

Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:

${resetUrl}

Este enlace expirará en 1 hora.

Si no solicitaste este cambio, puedes ignorar este correo.

Saludos,
${templateData.companyName}
        `.trim()
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email de recuperación enviado:', {
        messageId: result.messageId,
        email: email,
        accepted: result.accepted,
        rejected: result.rejected,
        pending: result.pending,
        response: result.response
      });

      // Verificar si el email fue rechazado
      if (result.rejected && result.rejected.length > 0) {
        console.warn('⚠️ Algunos destinatarios fueron rechazados:', result.rejected);
      }

      return {
        success: true,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected
      };

    } catch (error) {
      console.error('❌ Error enviando email:', error);
      throw new Error('Error al enviar el correo de recuperación');
    }
  }

  /**
   * Envía un email de confirmación de cambio de contraseña
   * @param {string} email - Email del destinatario
   * @param {object} user - Datos del usuario
   */
  async sendPasswordChangeConfirmation(email, user) {
    try {
      const templateData = {
        userName: `${user.nombre} ${user.apellidoPaterno}`,
        changeDate: new Date().toLocaleString('es-ES'),
        supportEmail: process.env.SUPPORT_EMAIL || 'soporte@sistema.com',
        companyName: process.env.COMPANY_NAME || 'Sistema de Seguimiento de Docentes',
        currentYear: new Date().getFullYear()
      };

      const htmlContent = this.compileTemplate('password-changed', templateData);

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Sistema de Seguimiento',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER
        },
        to: email,
        subject: 'Contraseña Actualizada - Sistema de Seguimiento',
        html: htmlContent,
        text: `
Hola ${templateData.userName},

Tu contraseña ha sido actualizada exitosamente el ${templateData.changeDate}.

Si no realizaste este cambio, contacta inmediatamente a nuestro soporte en ${templateData.supportEmail}.

Saludos,
${templateData.companyName}
        `.trim()
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email de confirmación enviado:', {
        messageId: result.messageId,
        email: email
      });

      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      console.error('❌ Error enviando email de confirmación:', error);
      // No lanzar error aquí, ya que el cambio de contraseña fue exitoso
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Envía un reporte de mal desempeño a un docente
   */
  async sendPoorPerformanceReport({ to, teacherName, assignments }) {
    this.ensureTransporter();

    const assignmentsList = assignments.map(assignment => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${assignment.title}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${new Date(assignment.dueDate).toLocaleDateString('es-MX')}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${new Date(assignment.closeDate).toLocaleDateString('es-MX')}</td>
        <td style="border: 1px solid #ddd; padding: 8px; color: #d32f2f;">${assignment.status}</td>
        <td style="border: 1px solid #ddd; padding: 8px; color: #d32f2f;">${assignment.daysPastDue} días</td>
      </tr>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte de Desempeño - Asignaciones</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f44336; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">⚠️ Reporte de Desempeño Laboral</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Estimado/a <strong>${teacherName}</strong>,</p>
            
            <p>Le informamos que tiene <strong>${assignments.length}</strong> asignación(es) que han cerrado sin haber recibido su entrega correspondiente. 
            Esto puede afectar su evaluación de desempeño laboral.</p>
            
            <h3 style="color: #d32f2f;">Asignaciones no entregadas:</h3>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #d32f2f; color: white;">
                  <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Asignación</th>
                  <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Fecha de Entrega</th>
                  <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Fecha de Cierre</th>
                  <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Estado</th>
                  <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Días de Retraso</th>
                </tr>
              </thead>
              <tbody>
                ${assignmentsList}
              </tbody>
            </table>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0;">
              <h4 style="color: #856404; margin-top: 0;">⚠️ Importante:</h4>
              <ul style="color: #856404;">
                <li>Las asignaciones cerradas sin entrega pueden afectar su evaluación de desempeño</li>
                <li>Se recomienda revisar regularmente las asignaciones pendientes en el sistema</li>
                <li>Para futuras asignaciones, puede entregarlas hasta la fecha de vencimiento (a tiempo) o hasta la fecha de cierre (con retraso)</li>
                <li>Después de la fecha de cierre, no se podrán realizar entregas</li>
              </ul>
            </div>
            
            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 20px 0;">
              <h4 style="color: #721c24; margin-top: 0;">📋 Consecuencias del Mal Desempeño:</h4>
              <ul style="color: #721c24;">
                <li>Impacto negativo en la evaluación de desempeño anual</li>
                <li>Posible revisión del status laboral</li>
                <li>Afectación en futuras asignaciones y responsabilidades</li>
                <li>Registro permanente en el expediente laboral</li>
              </ul>
            </div>
            
            <p>Para cualquier consulta, aclaración o si considera que hay un error en este reporte, puede contactar inmediatamente al departamento de recursos humanos o coordinación académica.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="background-color: #007bff; color: white; padding: 15px; border-radius: 5px; display: inline-block;">
                <strong>Acceda al sistema para revisar sus asignaciones pendientes</strong>
              </p>
            </div>
            
            <hr style="margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px;">
              Este es un mensaje automático del Sistema de Seguimiento Docente.<br>
              Fecha de generación: ${new Date().toLocaleDateString('es-MX', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}<br>
              No responda a este correo electrónico.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@seguimiento-docentes.com',
      to: to,
      subject: `⚠️ IMPORTANTE: Reporte de Desempeño - ${assignments.length} Asignación(es) No Entregada(s)`,
      html: emailHtml
    };

    return await this.transporter.sendMail(mailOptions);
  }

  /**
   * Envía recordatorios de asignaciones próximas a vencer
   */
  async sendAssignmentReminders({ to, teacherName, assignments }) {
    this.ensureTransporter();

    const assignmentsList = assignments.map(assignment => {
      const priorityColor = assignment.priority === 'high' ? '#d32f2f' : 
                          assignment.priority === 'medium' ? '#ff9800' : '#4caf50';
      const priorityText = assignment.priority === 'high' ? 'URGENTE' : 
                         assignment.priority === 'medium' ? 'IMPORTANTE' : 'NORMAL';

      return `
        <div style="background-color: white; padding: 20px; border-left: 4px solid ${priorityColor}; margin: 15px 0; border-radius: 5px;">
          <h4 style="margin-top: 0; color: ${priorityColor};">
            ${assignment.title} 
            <span style="font-size: 12px; background-color: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 3px;">${priorityText}</span>
          </h4>
          <p><strong>Descripción:</strong> ${assignment.description.substring(0, 150)}${assignment.description.length > 150 ? '...' : ''}</p>
          <p><strong>Fecha de entrega:</strong> ${new Date(assignment.dueDate).toLocaleDateString('es-MX')} a las ${new Date(assignment.dueDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
          <p><strong>Fecha de cierre:</strong> ${new Date(assignment.closeDate).toLocaleDateString('es-MX')} a las ${new Date(assignment.closeDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
          <p style="color: ${priorityColor}; font-weight: bold; font-size: 16px;">
            ${assignment.daysUntilDue <= 0 ? '⏰ VENCE HOY' : 
              assignment.daysUntilDue === 1 ? '⏰ VENCE MAÑANA' : 
              `⏰ Quedan ${assignment.daysUntilDue} días`}
          </p>
        </div>
      `;
    }).join('');

    const totalUrgent = assignments.filter(a => a.priority === 'high').length;
    const totalImportant = assignments.filter(a => a.priority === 'medium').length;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Recordatorio - Asignaciones Próximas a Vencer</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ff9800; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">⏰ Recordatorio de Asignaciones</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Estimado/a <strong>${teacherName}</strong>,</p>
            
            <p>Le recordamos que tiene <strong>${assignments.length}</strong> asignación(es) próxima(s) a vencer:</p>
            
            ${totalUrgent > 0 ? `
              <div style="background-color: #ffebee; border: 1px solid #f44336; padding: 15px; margin: 15px 0; border-radius: 5px;">
                <h4 style="color: #d32f2f; margin-top: 0;">🚨 URGENTE: ${totalUrgent} asignación(es) vencen hoy o mañana</h4>
              </div>
            ` : ''}
            
            ${totalImportant > 0 ? `
              <div style="background-color: #fff3e0; border: 1px solid #ff9800; padding: 15px; margin: 15px 0; border-radius: 5px;">
                <h4 style="color: #f57c00; margin-top: 0;">⚠️ IMPORTANTE: ${totalImportant} asignación(es) vencen en los próximos días</h4>
              </div>
            ` : ''}
            
            <h3 style="color: #ff9800;">Sus asignaciones pendientes:</h3>
            
            ${assignmentsList}
            
            <div style="background-color: #e3f2fd; border: 1px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h4 style="color: #1976d2; margin-top: 0;">📝 Recuerde:</h4>
              <ul style="color: #1976d2;">
                <li><strong>Hasta la fecha de entrega:</strong> Su entrega será marcada como "a tiempo"</li>
                <li><strong>Hasta la fecha de cierre:</strong> Su entrega será marcada como "con retraso"</li>
                <li><strong>Después del cierre:</strong> No se podrán realizar entregas y se considerará como incumplimiento</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="background-color: #4caf50; color: white; padding: 15px; border-radius: 5px; display: inline-block;">
                <strong>Ingrese al sistema ahora para revisar y entregar sus asignaciones</strong>
              </p>
            </div>
            
            <p>No deje pasar las fechas límite. Su puntualidad en las entregas es fundamental para la evaluación de su desempeño laboral.</p>
            
            <hr style="margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px;">
              Este es un mensaje automático del Sistema de Seguimiento Docente.<br>
              Fecha de envío: ${new Date().toLocaleDateString('es-MX', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}<br>
              No responda a este correo electrónico.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const urgentCount = assignments.filter(a => a.priority === 'high').length;
    const subjectPrefix = urgentCount > 0 ? '🚨 URGENTE' : '⏰';
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@seguimiento-docentes.com',
      to: to,
      subject: `${subjectPrefix} Recordatorio: ${assignments.length} Asignación(es) Próxima(s) a Vencer`,
      html: emailHtml
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendNewAssignmentNotification({ to, teacherName, title, description, dueDate, closeDate, assignmentUrl }) {
    try {
      this.ensureTransporter();

      const html = this.compileTemplate('new-assignment', {
        teacherName,
        title,
        description,
        dueDate: new Date(dueDate).toLocaleDateString('es-MX'),
        closeDate: new Date(closeDate).toLocaleDateString('es-MX'),
        assignmentUrl
      });

      const mailOptions = {
        from: `"Sistema de Seguimiento de Docentes" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Nueva Asignación - Sistema de Seguimiento de Docentes',
        html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Notificación de nueva asignación enviada a:', to);
      return result;
    } catch (error) {
      console.error('❌ Error enviando notificación de nueva asignación:', error);
      throw error;
    }
  }

  /**
   * Verifica la conexión del servicio de email
   */
  async verifyConnection() {
    try {
      this.ensureTransporter(); // Asegurar que el transportador esté inicializado
      await this.transporter.verify();
      console.log('✅ Servicio de email configurado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error en la configuración de email:', error);
      return false;
    }
  }
}

// Crear instancia única del servicio
const emailService = new EmailService();

export default emailService;
