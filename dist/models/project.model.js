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
exports.Project = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ProjectSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true,
        maxlength: [100, 'Project name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Project description is required'],
        trim: true,
        maxlength: [500, 'Project description cannot exceed 500 characters']
    },
    logo: {
        type: String,
        trim: true
    },
    media: [{
            type: String,
            trim: true
        }],
    status: {
        type: String,
        enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
        default: 'planning'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        validate: {
            validator: function (value) {
                return !value || value > this.startDate;
            },
            message: 'End date must be after start date'
        }
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    teamId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Team',
        required: false
    },
    members: [{
            user: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            role: {
                type: String,
                enum: ['owner', 'admin', 'member', 'viewer'],
                default: 'member'
            },
            joinedAt: {
                type: Date,
                default: Date.now
            }
        }],
    links: [{
            title: {
                type: String,
                required: true,
                trim: true
            },
            url: {
                type: String,
                required: true,
                trim: true
            },
            type: {
                type: String,
                enum: ['repository', 'documentation', 'design', 'other'],
                default: 'other'
            }
        }],
    tags: [{
            type: String,
            trim: true
        }],
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    settings: {
        allowMemberInvites: {
            type: Boolean,
            default: true
        },
        allowMemberTasks: {
            type: Boolean,
            default: true
        },
        allowMemberMeetings: {
            type: Boolean,
            default: true
        }
    },
    stats: {
        totalTasks: {
            type: Number,
            default: 0
        },
        completedTasks: {
            type: Number,
            default: 0
        },
        totalMeetings: {
            type: Number,
            default: 0
        },
        completedMeetings: {
            type: Number,
            default: 0
        },
        totalMembers: {
            type: Number,
            default: 1
        }
    },
    tasks: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Task'
        }],
    meetings: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Meeting'
        }]
}, {
    timestamps: true
});
// Indexes
ProjectSchema.index({ createdBy: 1 });
ProjectSchema.index({ 'members.user': 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ priority: 1 });
ProjectSchema.index({ isPublic: 1 });
// Virtual for member count
ProjectSchema.virtual('memberCount').get(function () {
    return this.members.length;
});
// Pre-save middleware to update stats
ProjectSchema.pre('save', function (next) {
    this.stats.totalMembers = this.members.length;
    next();
});
exports.Project = mongoose_1.default.model('Project', ProjectSchema);
