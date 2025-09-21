# 🚀 Slack Dev Server

<div align="center">
  <img src="public/logo.png" alt="Slack Dev Logo" width="200" height="200">
  
  ### *A Developer's Best Friend* 
  **Manage Projects at Ease**
  
  ![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
  ![Express](https://img.shields.io/badge/Express-4.18+-lightgrey.svg)
  ![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)
  ![JWT](https://img.shields.io/badge/JWT-Auth-orange.svg)
</div>

---

## ✨ **What is Slack Dev?**

Slack Dev is a **powerful development tool** designed to streamline project management and development workflows. Built with modern technologies, it provides a robust backend foundation that developers can rely on to build scalable applications quickly and efficiently.

## 🎯 **Why Slack Dev?**

- 🔐 **Complete Authentication System** - JWT-based auth with email verification
- 👤 **User Management** - Profile updates, avatar uploads, password management  
- 📧 **Email Integration** - Beautiful email templates with OTP verification
- 📚 **API Documentation** - Interactive Swagger UI with authentication
- 🛡️ **Security First** - Best practices implemented out of the box
- 🎨 **Modern Architecture** - Clean code structure following industry standards

---

## 🚀 **Quick Start**

### Prerequisites
- Node.js 18+
- MongoDB 6.0+
- Gmail account (for email services)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd core-stack/server

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configurations

# Start development server
npm run dev
```

### Environment Variables

```env
# Server Configuration
PORT=8080
BASE_URL=http://localhost:8080

# Database
MONGODB_URI=mongodb://localhost:27017/slack-dev

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# Email Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password
```

---
## 🎨 **Features**

### 🔒 **Robust Authentication**
- JWT-based authentication
- Email verification with beautiful OTP emails
- Password reset functionality
- Secure password hashing

### 📧 **Email System**
- Modern, responsive email templates
- OTP verification with styled blocks
- Logo embedding in emails
- Multiple email templates (verification, password reset)

### 👥 **User Management**
- Profile updates with validation
- Avatar upload and management
- Password change with current password verification
- User data consistency

### 📖 **API Documentation**
- Interactive Swagger UI at `/api-docs`
- Bearer token authentication in Swagger
- Complete endpoint documentation
- Request/response examples

### 🛡️ **Security Features**
- Input validation and sanitization
- Rate limiting ready
- CORS configuration
- Secure file uploads
- Error handling middleware

---

## 🏗️ **Architecture**

```
server/
├── 📁 config/          # Database and app configuration
├── 📁 controllers/     # Request handlers and business logic
├── 📁 helpers/         # Utility functions and helpers
├── 📁 interfaces/      # TypeScript interfaces
├── 📁 middlewares/     # Express middlewares
├── 📁 models/          # Database models
├── 📁 routes/          # API route definitions
├── 📁 templates/       # Email templates
├── 📁 uploads/         # File upload storage
├── 📁 utils/           # Utility functions
└── 📄 index.ts         # Application entry point
```

---

## 🔧 **Tech Stack**

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime Environment | 18+ |
| **TypeScript** | Type Safety | 5.0+ |
| **Express.js** | Web Framework | 4.18+ |
| **MongoDB** | Database | 6.0+ |
| **Mongoose** | ODM | Latest |
| **JWT** | Authentication | Latest |
| **Nodemailer** | Email Service | Latest |
| **Multer** | File Upload | Latest |
| **Swagger** | API Documentation | Latest |

---

## 📱 **Usage Examples**

### Register a new user
```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'johndoe',
    email: 'john@example.com',
    password: 'securepassword123'
  })
});
```

### Upload avatar
```javascript
const formData = new FormData();
formData.append('avatar', file);

const response = await fetch('/api/user/avatar', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

---

## 🎯 **Perfect For**

- 🚀 **Startups** building MVPs quickly
- 👨‍💻 **Developers** needing reliable backend foundation  
- 🏢 **Teams** wanting consistent project structure
- 📱 **Mobile Apps** requiring robust API backend
- 🌐 **Web Applications** with user management needs

---

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🌟 **Support**

If you find this project helpful, please give it a ⭐ on GitHub!

For support and questions:
- 📧 Email: support@slackdev.com
- 💬 Issues: [GitHub Issues](https://github.com/slack-dev-server/issues)
- 📖 Docs: [API Documentation](http://localhost:8080/api-docs)

---

<div align="center">
  <p><strong>Made with ❤️ by developers, for developers</strong></p>
  <p><em>Slack Dev - Where Development Meets Simplicity</em></p>
</div>
