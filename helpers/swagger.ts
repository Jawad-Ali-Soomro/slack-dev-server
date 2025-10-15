export const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Core Stack API",
      version: "1.0.0",
      description: "Complete authentication system with email verification and password reset",
    },
    servers: [
      {
        url: "http://localhost:4000",
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
