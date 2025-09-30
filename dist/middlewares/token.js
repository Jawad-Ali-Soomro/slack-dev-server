"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const generateToken = (payload, expiresIn = '1d') => {
    const secret = process.env.JWT_SECRET || 'default_secret';
    return jsonwebtoken_1.default.sign(payload, secret);
};
exports.generateToken = generateToken;
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'default_secret');
        const user = await models_1.User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: 'Invalid token.' });
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Invalid token.' });
    }
};
exports.authenticate = authenticate;
