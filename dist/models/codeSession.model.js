"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const CodeSessionSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    language: {
        type: String,
        required: true,
        enum: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'html', 'css', 'sql', 'json', 'xml', 'yaml', 'markdown'],
        default: 'javascript'
    },
    code: {
        type: String,
        default: ''
    },
    owner: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    participants: [{
            user: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            joinedAt: {
                type: Date,
                default: Date.now
            },
            lastActive: {
                type: Date,
                default: Date.now
            },
            cursorPosition: {
                line: Number,
                column: Number
            }
        }],
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: {
        type: Date
    },
    maxParticipants: {
        type: Number,
        default: 10,
        min: 2,
        max: 50
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    inviteCode: {
        type: String,
        unique: true,
        sparse: true
    },
    invitedUsers: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }],
    tags: [{
            type: String,
            trim: true,
            maxlength: 20
        }]
}, {
    timestamps: true
});
// Indexes for better performance
CodeSessionSchema.index({ owner: 1, isActive: 1 });
CodeSessionSchema.index({ 'participants.user': 1, isActive: 1 });
CodeSessionSchema.index({ isPublic: 1, isActive: 1 });
CodeSessionSchema.index({ language: 1, isActive: 1 });
CodeSessionSchema.index({ createdAt: -1 });
// Update the updatedAt field before saving
CodeSessionSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
// Virtual for participant count
CodeSessionSchema.virtual('participantCount').get(function () {
    return this.participants.length;
});
// Method to add participant
CodeSessionSchema.methods.addParticipant = function (userId) {
    const existingParticipant = this.participants.find((p) => p.user.toString() === userId);
    if (!existingParticipant && this.participants.length < this.maxParticipants) {
        this.participants.push({
            user: userId,
            joinedAt: new Date(),
            lastActive: new Date()
        });
        return true;
    }
    return false;
};
// Method to remove participant
CodeSessionSchema.methods.removeParticipant = function (userId) {
    const participantIndex = this.participants.findIndex((p) => p.user.toString() === userId);
    if (participantIndex !== -1) {
        this.participants.splice(participantIndex, 1);
        return true;
    }
    return false;
};
// Method to update participant activity
CodeSessionSchema.methods.updateParticipantActivity = function (userId, cursorPosition) {
    const participant = this.participants.find((p) => p.user.toString() === userId);
    if (participant) {
        participant.lastActive = new Date();
        if (cursorPosition) {
            participant.cursorPosition = cursorPosition;
        }
        return true;
    }
    return false;
};
// Method to generate invite code
CodeSessionSchema.methods.generateInviteCode = function () {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.inviteCode = result;
    return result;
};
// Method to add invited user
CodeSessionSchema.methods.addInvitedUser = function (userId) {
    if (!this.invitedUsers.includes(userId)) {
        this.invitedUsers.push(userId);
        return true;
    }
    return false;
};
// Method to check if user can join (public or invited)
CodeSessionSchema.methods.canUserJoin = function (userId) {
    if (this.isPublic)
        return true;
    if (this.invitedUsers.includes(userId))
        return true;
    if (this.owner.toString() === userId)
        return true;
    return false;
};
exports.default = mongoose_1.default.model('CodeSession', CodeSessionSchema);
