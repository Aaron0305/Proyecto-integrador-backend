import express from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import User from '../models/User.js';
import WebAuthnCredential from '../models/WebAuthnCredential.js';

const router = express.Router();

// Configuración del Relying Party (RP)
const getRPConfig = (req) => {
  const origin = req.get('origin') || '';
  const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');

  return {
    name: 'Sistema de Gestión Académica',
    id: isLocalhost ? 'localhost' : process.env.RP_ID || 'proyecto-integrador-frontend-nu.vercel.app',
    origin: isLocalhost ? origin : process.env.RP_ORIGIN || 'https://proyecto-integrador-frontend-nu.vercel.app'
  };
};

// Almacenamiento temporal de challenges (en producción usar Redis)
const challenges = new Map();

// POST /api/webauthn/register/begin
// Inicia el proceso de registro de huella digital
router.post('/register/begin', async (req, res) => {
  try {
    const { email, username } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico es requerido'
      });
    }

    // Normalizar email
    const normalizedEmail = email.toLowerCase().trim();

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico no tiene un formato válido'
      });
    }

    // Verificar si el usuario ya existe
    let user = await User.findOne({ email: normalizedEmail });

    // Si el usuario no existe, creamos un ID temporal basado en el email
    let userId;
    if (user) {
      userId = user._id.toString();
    } else {
      // Crear un ID temporal basado en el email (será usado solo para WebAuthn)
      userId = Buffer.from(normalizedEmail).toString('base64url');
    }

    // Verificar si ya tiene una credencial registrada
    const existingCredential = await WebAuthnCredential.findOne({ email: normalizedEmail });
    if (existingCredential && user) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una huella digital registrada para este usuario'
      });
    }

    // Generar opciones de registro
    const rp = getRPConfig(req);
    const displayName = username || normalizedEmail;

    let options;
    try {
      options = await generateRegistrationOptions({
        rpName: rp.name,
        rpID: rp.id,
        userID: Buffer.from(userId),
        userName: normalizedEmail,
        userDisplayName: displayName,
        timeout: 60000,
        attestationType: 'direct',
        excludeCredentials: existingCredential ? [{
          id: isoBase64URL.toBuffer(existingCredential.credentialID),
          type: 'public-key',
        }] : [],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: false,
        },
        supportedAlgorithmIDs: [-7, -257], // ES256, RS256
      });
    } catch (optionsError) {
      console.error('Error generando opciones de registro:', optionsError);
      return res.status(500).json({
        success: false,
        message: 'Error al generar opciones de registro',
        error: process.env.NODE_ENV === 'development' ? optionsError.message : undefined
      });
    }

    // Guardar el challenge temporalmente (expira en 5 minutos)
    const challengeKey = `${normalizedEmail}_register`;
    challenges.set(challengeKey, {
      challenge: options.challenge,
      email: normalizedEmail,
      userId: userId,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutos
    });

    // Limpiar challenges expirados
    cleanupExpiredChallenges();

    res.json({
      success: true,
      challenge: options.challenge,
      user: {
        id: isoBase64URL.fromBuffer(Buffer.from(userId)),
        name: normalizedEmail,
        displayName: displayName,
      },
      rp: {
        name: rp.name,
        id: rp.id,
      },
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout,
      attestation: options.attestation,
      authenticatorSelection: options.authenticatorSelection,
    });

  } catch (error) {
    console.error('Error en register/begin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar el registro de huella digital',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/webauthn/register/complete
// Completa el proceso de registro y valida la credencial
router.post('/register/complete', async (req, res) => {
  try {
    const { email, credential } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico es requerido'
      });
    }

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'La credencial es requerida'
      });
    }

    // Validar estructura de la credencial
    if (!credential.id || !credential.rawId || !credential.response) {
      return res.status(400).json({
        success: false,
        message: 'La credencial está incompleta. Verifica que hayas capturado la huella correctamente.'
      });
    }

    if (!credential.response.clientDataJSON || !credential.response.attestationObject) {
      return res.status(400).json({
        success: false,
        message: 'Los datos de la credencial están incompletos'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const challengeKey = `${normalizedEmail}_register`;
    const challengeData = challenges.get(challengeKey);

    if (!challengeData) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró un registro de registro activo. Por favor, intenta de nuevo desde el paso de huella digital.'
      });
    }

    // Verificar que el challenge no haya expirado
    if (Date.now() > challengeData.expiresAt) {
      challenges.delete(challengeKey);
      return res.status(400).json({
        success: false,
        message: 'El tiempo para registrar la huella ha expirado (máximo 5 minutos). Por favor, intenta de nuevo.'
      });
    }

    // Verificar si ya existe una credencial con este ID
    const existingCredential = await WebAuthnCredential.findOne({
      credentialID: credential.id
    });

    if (existingCredential) {
      challenges.delete(challengeKey);
      return res.status(400).json({
        success: false,
        message: 'Esta huella digital ya está registrada. Si es tuya, inicia sesión con ella.'
      });
    }

    const rp = getRPConfig(req);

    // Verificar la respuesta de registro
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: {
          id: credential.id,
          rawId: credential.rawId,
          response: {
            clientDataJSON: credential.response.clientDataJSON,
            attestationObject: credential.response.attestationObject,
          },
          type: credential.type || 'public-key',
        },
        expectedChallenge: challengeData.challenge,
        expectedOrigin: rp.origin,
        expectedRPID: rp.id,
        requireUserVerification: true,
      });
    } catch (verifyError) {
      console.error('Error al verificar la credencial:', verifyError);
      challenges.delete(challengeKey);
      
      // Proporcionar mensajes de error más específicos
      let errorMessage = 'Error al verificar la huella digital';
      if (verifyError.message.includes('challenge')) {
        errorMessage = 'El desafío de verificación no coincide. Por favor, intenta de nuevo.';
      } else if (verifyError.message.includes('origin')) {
        errorMessage = 'El origen de la solicitud no es válido. Asegúrate de estar en el sitio correcto.';
      } else if (verifyError.message.includes('RP')) {
        errorMessage = 'El identificador de la plataforma no coincide. Por favor, intenta de nuevo.';
      }
      
      return res.status(400).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? verifyError.message : undefined
      });
    }

    if (!verification.verified) {
      challenges.delete(challengeKey);
      return res.status(400).json({
        success: false,
        message: 'La verificación de la huella digital falló. La huella no fue verificada correctamente.'
      });
    }

    if (!verification.registrationInfo) {
      challenges.delete(challengeKey);
      return res.status(400).json({
        success: false,
        message: 'No se pudo obtener la información de registro de la huella'
      });
    }

    const { registrationInfo } = verification;

    // Buscar el usuario por email (podría existir o no)
    let user = await User.findOne({ email: normalizedEmail });

    // Crear y guardar la credencial
    // El campo 'user' ahora puede ser null, se completará cuando el usuario se registre
    const newCredential = new WebAuthnCredential({
      user: user ? user._id : null,
      email: normalizedEmail,
      credentialID: credential.id,
      credentialPublicKey: Buffer.from(registrationInfo.credentialPublicKey),
      counter: registrationInfo.counter,
      deviceType: registrationInfo.authenticatorAttachment || 'platform',
      backupEligible: registrationInfo.credentialBackedUp || false,
      backupState: registrationInfo.credentialBackedUp || false,
    });

    const savedCredential = await newCredential.save();

    // Si el usuario ya existe, actualizar su referencia a la credencial
    if (user) {
      user.webauthnCredentialId = savedCredential._id;
      await user.save();
    }

    // Limpiar el challenge usado
    challenges.delete(challengeKey);

    res.json({
      success: true,
      message: 'Huella digital registrada exitosamente',
      credentialId: savedCredential._id.toString(),
      credentialID: savedCredential.credentialID,
    });

  } catch (error) {
    console.error('Error en register/complete:', error);
    res.status(500).json({
      success: false,
      message: 'Error al completar el registro de huella digital',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Función para limpiar challenges expirados
function cleanupExpiredChallenges() {
  const now = Date.now();
  for (const [key, data] of challenges.entries()) {
    if (now > data.expiresAt) {
      challenges.delete(key);
    }
  }
}

// Ejecutar limpieza cada 10 minutos
setInterval(cleanupExpiredChallenges, 10 * 60 * 1000);

export default router;

