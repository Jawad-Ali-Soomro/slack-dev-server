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
        url: "https://c4b45d68-d548-497d-a47b-ae04856a5fbc-00-1956bkb0royma.sisko.replit.dev:8080/",
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
