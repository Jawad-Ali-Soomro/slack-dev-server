export const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Skack Developers API",
      version: "1.0.0",
      description: "Complete authentication system with email verification and password reset",
    },
    servers: [
      {
        url: process.env.SERVER_URL,
        description: "Development server"
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.ts", "./models/*.ts"],
};
