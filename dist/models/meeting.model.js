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
const interfaces_1 = require("../interfaces");
const MeetingSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
        type: String,
        enum: Object.values(interfaces_1.MeetingType),
        default: interfaces_1.MeetingType.ONLINE,
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(interfaces_1.MeetingStatus),
        default: interfaces_1.MeetingStatus.SCHEDULED,
        required: true,
    },
    assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    assignedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    projectId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Project" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: { type: String, trim: true },
    meetingLink: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    attendees: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });
// Ensure endDate is after startDate
MeetingSchema.path('endDate').validate(function (value) {
    return this.startDate && value >= this.startDate;
}, 'End date must be after start date');
// Require location for in-person meetings
MeetingSchema.pre('save', function (next) {
    if (this.type === interfaces_1.MeetingType.IN_PERSON && !this.location) {
        next(new Error('Location is required for in-person meetings'));
    }
    else if (this.type === interfaces_1.MeetingType.ONLINE && !this.meetingLink) {
        next(new Error('Meeting link is required for online meetings'));
    }
    else {
        next();
    }
});
const Meeting = mongoose_1.default.model("Meeting", MeetingSchema);
exports.default = Meeting;
