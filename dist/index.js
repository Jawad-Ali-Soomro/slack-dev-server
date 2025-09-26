"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const helpers_1 = require("./helpers");
const config_1 = require("./config");
const routes_1 = __importDefault(require("./routes"));
const cors_1 = __importDefault(require("cors"));
const socketService_1 = __importDefault(require("./services/socketService"));
const swaggerSpec = (0, swagger_jsdoc_1.default)(helpers_1.swaggerOptions);
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
dotenv_1.default.config({
    path: './config/.env'
});
helpers_1.logger.info('server requested');
(0, config_1.dbConnection)();
process.on("uncaughtException", (err, next) => {
    helpers_1.logger.error(`uncaught exception: ${err.message}`);
    process.exit(1);
});
process.on("unhandledRejection", (err, next) => {
    helpers_1.logger.error(`unhandled rejection: ${err.message}`);
    process.exit(1);
});
app.use((0, cors_1.default)({
    origin: "*",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 200,
}));
helpers_1.logger.info(`cors is running on ${process.env.FRONTEND_URL}`);
app.use(express_1.default.static('public'));
app.use('/profiles', express_1.default.static('uploads/profiles'));
app.use('/projects', express_1.default.static('uploads/projects'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/api", routes_1.default);
// Initialize Socket.IO
const socketService = new socketService_1.default(server);
// Make socketService available globally for use in controllers
global.socketService = socketService;
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🔌 Socket.IO server ready for connections`);
});
