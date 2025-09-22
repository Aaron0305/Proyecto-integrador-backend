import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    closeDate: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isGeneral: {
        type: Boolean,
        default: false
    },
    assignedTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'completed-late', 'not-delivered', 'scheduled', 'active', 'cancelled', 'publication_error'],
        default: 'pending'
    },
    // Campos para asignaciones programadas
    scheduledPublish: {
        type: Boolean,
        default: false
    },
    publishDate: {
        type: Date
    },
    publishedAt: {
        type: Date
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high'],
        default: 'normal'
    },
    reminderSettings: {
        enabled: {
            type: Boolean,
            default: false
        },
        daysBeforeDue: {
            type: Number,
            default: 2
        }
    },
    cancelledAt: {
        type: Date
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedAt: {
        type: Date
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    publicationError: {
        type: String
    },
    completedAt: {
        type: Date
    },
    attachments: [{
        fileName: String,        // Nombre original del archivo
        fileUrl: String,        // URL de Cloudinary
        cloudinaryId: String,   // ID de Cloudinary
        mimeType: String,       // Tipo MIME del archivo
        fileSize: Number,       // Tamaño en bytes
        fileType: String,       // Tipo de archivo (pdf, doc, etc.)
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    originalAssignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        default: null
    },
    responses: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        files: [{
            fileName: String,        // Nombre original del archivo
            fileUrl: String,        // URL de Cloudinary
            cloudinaryId: String,   // ID de Cloudinary
            mimeType: String,       // Tipo MIME del archivo
            fileSize: Number,       // Tamaño en bytes
            fileType: String,       // Tipo de archivo (pdf, doc, etc.)
            uploadedAt: {
                type: Date,
                default: Date.now
            }
        }],
        submittedAt: {
            type: Date,
            default: Date.now
        },
        submissionStatus: {
            type: String,
            enum: ['on-time', 'late', 'closed'],
            default: 'on-time'
        },
        status: {
            type: String,
            enum: ['submitted', 'reviewed'],
            default: 'submitted'
        }
    }]
});

export default mongoose.model('Assignment', assignmentSchema);