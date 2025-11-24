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

  // Tratamos de inferir el hostname desde el origin si no se configura con variables de entorno
  const inferredHostname = (() => {
    try {
      return origin ? new URL(origin).hostname : null;
    } catch (e) {
      return null;
    }
  })();

  const id = isLocalhost ? 'localhost' : (process.env.RP_ID || inferredHostname || process.env.FRONTEND_URL || 'proyecto-integrador-frontend-nu.vercel.app');
  const rpOrigin = isLocalhost ? origin : (process.env.RP_ORIGIN || origin || process.env.FRONTEND_URL || 'https://proyecto-integrador-frontend-nu.vercel.app');

  const rp = {
    name: 'Sistema de Gestión Académica',
    id,
    origin: rpOrigin
  };

  // Logging informativo para diagnóstico (se recomienda deshabilitar en producción)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[webauthn] getRPConfig -> origin header:', origin, ' | inferredHostname:', inferredHostname);
    console.log('[webauthn] getRPConfig -> rp config:', rp);
  }

  return rp;
};

// Almacenamiento temporal de challenges (en producción usar Redis)
const challenges = new Map();

// POST /api/webauthn/register/begin
router.post('/register/begin', async (req, res) => {
  try {
    const { email, username } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico es requerido'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico no tiene un formato válido'
      });
    }

    let user = await User.findOne({ email: normalizedEmail });

    let userId;
    if (user) {
      userId = user._id.toString();
    } else {
      userId = Buffer.from(normalizedEmail).toString('base64url');
    }

    const existingCredential = await WebAuthnCredential.findOne({ email: normalizedEmail });
    if (existingCredential && user) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una huella digital registrada para este usuario'
      });
    }

    const rp = getRPConfig(req);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[webauthn] POST /register/begin | origin:', req.get('origin'), ' rp:', rp, ' normalizedEmail:', normalizedEmail);
    }
    const displayName = username || normalizedEmail;

    let options;
    try {
      options = await generateRegistrationOptions({
        rpName: rp.name,
        rpID: rp.id,
        userID: isoUint8Array.fromUTF8String(normalizedEmail),
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
        supportedAlgorithmIDs: [-7, -257],
      });
    } catch (optionsError) {
      console.error('Error generando opciones de registro:', optionsError);
      return res.status(500).json({
        success: false,
        message: 'Error al generar opciones de registro',
        error: process.env.NODE_ENV === 'development' ? optionsError.message : undefined
      });
    }

    const challengeKey = `${normalizedEmail}_register`;
    challenges.set(challengeKey, {
      challenge: options.challenge,
      email: normalizedEmail,
      userId: userId,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    cleanupExpiredChallenges();

    res.json({
      success: true,
      challenge: options.challenge,
      user: {
        id: isoBase64URL.fromBuffer(isoUint8Array.fromUTF8String(normalizedEmail)),
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

    if (!credential.id || !credential.rawId || !credential.response) {
      return res.status(400).json({
        success: false,
        message: 'La credencial está incompleta'
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
        message: 'No se encontró un registro de registro activo. Por favor, intenta de nuevo.'
      });
    }

    if (Date.now() > challengeData.expiresAt) {
      challenges.delete(challengeKey);
      return res.status(400).json({
        success: false,
        message: 'El tiempo para registrar la huella ha expirado (máximo 5 minutos).'
      });
    }

    const existingCredential = await WebAuthnCredential.findOne({
      credentialID: credential.id
    });

    if (existingCredential) {
      challenges.delete(challengeKey);
      return res.status(400).json({
        success: false,
        message: 'Esta huella digital ya está registrada.'
      });
    }

    const rp = getRPConfig(req);

    // Convertir id a base64url si es necesario
    let credentialId = credential.id;
    try {
      // Si id no es string, convertir a base64url
      if (typeof credentialId !== 'string') {
        credentialId = isoBase64URL.fromBuffer(Buffer.from(credentialId));
      }
      // Validar que sea base64url válido
      isoBase64URL.toBuffer(credentialId);
    } catch (idError) {
      console.error('Error procesando id:', idError);
      challenges.delete(challengeKey);
      return res.status(400).json({
        success: false,
        message: 'El ID de credencial no está en el formato correcto',
        error: process.env.NODE_ENV === 'development' ? idError.message : undefined
      });
    }

    // Convertir rawId a Buffer
    let rawIdBuffer;
    try {
      if (typeof credential.rawId === 'string') {
        rawIdBuffer = isoBase64URL.toBuffer(credential.rawId);
      } else if (credential.rawId instanceof Uint8Array || credential.rawId instanceof ArrayBuffer) {
        rawIdBuffer = Buffer.from(credential.rawId);
      } else {
        throw new Error('rawId tiene formato inválido');
      }
    } catch (rawIdError) {
      console.error('Error procesando rawId:', rawIdError);
      challenges.delete(challengeKey);
      return res.status(400).json({
        success: false,
        message: 'El ID de credencial no está en el formato correcto',
        error: process.env.NODE_ENV === 'development' ? rawIdError.message : undefined
      });
    }

    // Convertir clientDataJSON a Buffer
    let clientDataJSONBuffer;
    try {
      if (typeof credential.response.clientDataJSON === 'string') {
        clientDataJSONBuffer = isoBase64URL.toBuffer(credential.response.clientDataJSON);
      } else if (credential.response.clientDataJSON instanceof Uint8Array || credential.response.clientDataJSON instanceof ArrayBuffer) {
        clientDataJSONBuffer = Buffer.from(credential.response.clientDataJSON);
      } else {
        throw new Error('clientDataJSON tiene formato inválido');
      }
    } catch (clientDataError) {
      console.error('Error procesando clientDataJSON:', clientDataError);
      challenges.delete(challengeKey);
      return res.status(400).json({
        success: false,
        message: 'Los datos del cliente no están en el formato correcto',
        error: process.env.NODE_ENV === 'development' ? clientDataError.message : undefined
      });
    }

    // Convertir attestationObject a Buffer
    let attestationObjectBuffer;
    try {
      if (typeof credential.response.attestationObject === 'string') {
        attestationObjectBuffer = isoBase64URL.toBuffer(credential.response.attestationObject);
      } else if (credential.response.attestationObject instanceof Uint8Array || credential.response.attestationObject instanceof ArrayBuffer) {
        attestationObjectBuffer = Buffer.from(credential.response.attestationObject);
      } else {
        throw new Error('attestationObject tiene formato inválido');
      }
    } catch (attestationError) {
      console.error('Error procesando attestationObject:', attestationError);
      challenges.delete(challengeKey);
      return res.status(400).json({
        success: false,
        message: 'El objeto de atestación no está en el formato correcto',
        error: process.env.NODE_ENV === 'development' ? attestationError.message : undefined
      });
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: {
          id: credentialId,
          rawId: rawIdBuffer,
          response: {
            clientDataJSON: clientDataJSONBuffer,
            attestationObject: attestationObjectBuffer,
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
      if (process.env.NODE_ENV !== 'production') {
        console.log('[webauthn] verify error details:', verifyError);
        console.log('[webauthn] POST /register/complete | origin:', req.get('origin'), ' rp:', rp, ' challenge:', challengeData);
      }
      challenges.delete(challengeKey);
      
      let errorMessage = 'Error al verificar la huella digital';
      if (verifyError.message.includes('challenge')) {
        errorMessage = 'El desafío de verificación no coincide.';
      } else if (verifyError.message.includes('origin')) {
        errorMessage = 'El origen de la solicitud no es válido.';
      } else if (verifyError.message.includes('RP')) {
        errorMessage = 'El identificador de la plataforma no coincide.';
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
        message: 'La verificación de la huella digital falló.'
      });
    }

    if (!verification.registrationInfo) {
      challenges.delete(challengeKey);
      return res.status(400).json({
        success: false,
        message: 'No se pudo obtener la información de registro'
      });
    }

    const { registrationInfo } = verification;

    let user = await User.findOne({ email: normalizedEmail });

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

    if (user) {
      user.webauthnCredentialId = savedCredential._id;
      await user.save();
    }

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

function cleanupExpiredChallenges() {
  const now = Date.now();
  for (const [key, data] of challenges.entries()) {
    if (now > data.expiresAt) {
      challenges.delete(key);
    }
  }
}

setInterval(cleanupExpiredChallenges, 10 * 60 * 1000);

export default router;