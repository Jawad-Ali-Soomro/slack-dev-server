"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingStatus = exports.MeetingType = void 0;
var MeetingType;
(function (MeetingType) {
    MeetingType["ONLINE"] = "online";
    MeetingType["IN_PERSON"] = "in-person";
    MeetingType["HYBRID"] = "hybrid";
})(MeetingType || (exports.MeetingType = MeetingType = {}));
var MeetingStatus;
(function (MeetingStatus) {
    MeetingStatus["SCHEDULED"] = "scheduled";
    MeetingStatus["COMPLETED"] = "completed";
    MeetingStatus["CANCELLED"] = "cancelled";
    MeetingStatus["PENDING"] = "pending";
})(MeetingStatus || (exports.MeetingStatus = MeetingStatus = {}));
