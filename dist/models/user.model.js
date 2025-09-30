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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const interfaces_1 = require("../interfaces");
const UserSchema = new mongoose_1.Schema({
    email: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: interfaces_1.Role
    },
    emailVerificationToken: {
        type: String
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationTokenExpires: {
        type: Date
    },
    passwordResetToken: {
        type: String
    },
    passwordResetTokenExpires: {
        type: Date
    },
    avatar: {
        type: String
    },
    bio: {
        type: String,
        maxlength: 500
    },
    userLocation: {
        type: String
    },
    website: {
        type: String
    },
    socialLinks: {
        twitter: {
            type: String
        },
        linkedin: {
            type: String
        },
        github: {
            type: String
        },
        instagram: {
            type: String
        },
        facebook: {
            type: String
        }
    },
    dateOfBirth: {
        type: Date
    },
    phone: {
        type: String
    },
    isPrivate: {
        type: Boolean,
        default: false
    },
    followers: {
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: "User",
        default: []
    },
    following: {
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: "User",
        default: []
    },
    projects: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Project"
        }],
    teams: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Team"
        }]
});
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password"))
        return next();
    this.password = await bcryptjs_1.default.hash(this.password, 10);
    next();
});
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcryptjs_1.default.compare(candidatePassword, this.password);
};
const User = mongoose_1.default.model("User", UserSchema);
exports.default = User;
