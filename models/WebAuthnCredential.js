import mongoose from 'mongoose';

const webauthnCredentialSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  credentialID: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  credentialPublicKey: {
    type: Buffer,
    required: true
  },
  counter: {
    type: Number,
    required: true,
    default: 0
  },
  deviceType: {
    type: String,
    enum: ['platform', 'cross-platform'],
    default: 'platform'
  },
  backupEligible: {
    type: Boolean,
    default: false
  },
  backupState: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
});

// Índice compuesto para búsquedas eficientes
webauthnCredentialSchema.index({ user: 1, credentialID: 1 });

const WebAuthnCredential = mongoose.model('WebAuthnCredential', webauthnCredentialSchema);

export default WebAuthnCredential;

