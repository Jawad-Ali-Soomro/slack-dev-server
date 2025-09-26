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
exports.Team = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TeamSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Team name is required'],
        trim: true,
        maxlength: [100, 'Team name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Team description cannot exceed 500 characters']
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
            user: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            role: {
                type: String,
                enum: ['owner', 'admin', 'member'],
                default: 'member'
            },
            joinedAt: {
                type: Date,
                default: Date.now
            }
        }],
    projects: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Project'
        }],
    isActive: {
        type: Boolean,
        default: true
    },
    settings: {
        allowMemberInvites: {
            type: Boolean,
            default: true
        },
        allowProjectCreation: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true
});
// Indexes
TeamSchema.index({ createdBy: 1 });
TeamSchema.index({ 'members.user': 1 });
TeamSchema.index({ isActive: 1 });
// Virtual for member count
TeamSchema.virtual('memberCount').get(function () {
    return this.members.length;
});
// Pre-save middleware to ensure owner is in members
TeamSchema.pre('save', function (next) {
    const ownerExists = this.members.some(member => member.user.toString() === this.createdBy.toString());
    if (!ownerExists) {
        this.members.push({
            user: this.createdBy,
            role: 'owner',
            joinedAt: new Date()
        });
    }
    next();
});
exports.Team = mongoose_1.default.model('Team', TeamSchema);
