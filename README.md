# Automated IT Support Tools Platform

A comprehensive IT support management system designed for hospital environments, featuring automated workflows, inventory management, request tracking, and integrated bug reporting with version management.

## 🏗️ Architecture Overview

This platform is built using a modern full-stack architecture:

- **Frontend**: Next.js 14+ with React 18, Tabler Admin UI, Tailwind CSS
- **Backend**: NestJS with TypeScript, PostgreSQL, Prisma ORM
- **Authentication**: JWT with Passport.js, Role-based Access Control (RBAC)
- **DevOps**: Docker, Docker Compose, GitHub Actions CI/CD
- **Testing**: Jest, React Testing Library, Cypress
- **Monitoring**: Prometheus, Grafana, Sentry

## 🚀 Features

### Core Modules
- **Admin Module**: User management, permissions, audit logging, system settings
- **Inventory Module**: Asset lifecycle management, tracking, predictive analytics
- **Warehouse Module**: Stock management, automated alerts, barcode/QR integration
- **Request Module**: Multi-level approval workflows, automated notifications
- **Version Management**: Semantic versioning, automated release notes, changelog generation
- **Bug Tracking**: Integrated issue reporting, feature requests, status tracking

### Automation Features
- Intelligent form auto-completion
- Predictive analytics for inventory forecasting
- Automated maintenance reminders
- Smart asset lifecycle management
- Cross-module data synchronization

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Development Setup

1. **Clone and setup**
```bash
git clone <repository-url>
cd Automated-IT-Support-Tools-Platform
npm run setup
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your database and other configurations
```

3. **Start Development Environment**
```bash
npm run dev:docker  # Starts all services with Docker
# OR
npm run dev         # Starts services individually
```

4. **Database Setup**
```bash
npm run db:migrate
npm run db:seed
```

## 📁 Project Structure

```
├── apps/
│   ├── backend/          # NestJS API server
│   ├── frontend/         # Next.js web application
│   └── shared/           # Shared types and utilities
├── packages/
│   ├── ui/              # Shared UI components
│   ├── eslint-config/   # ESLint configurations
│   └── tsconfig/        # TypeScript configurations
├── docker/              # Docker configurations
├── docs/               # Documentation
└── scripts/            # Build and deployment scripts
```

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Development
npm run dev                 # Start all services
npm run dev:backend        # Backend only
npm run dev:frontend       # Frontend only

# Testing
npm run test               # Run all tests
npm run test:unit         # Unit tests
npm run test:e2e          # End-to-end tests
npm run test:coverage     # Test coverage

# Database
npm run db:migrate        # Run migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio

# Docker
npm run docker:dev       # Development with Docker
npm run docker:prod      # Production build
```

## 📋 Development Phases

- [x] **Phase 1**: Core System & Authentication Infrastructure
- [ ] **Phase 2**: Admin Module Implementation
- [ ] **Phase 3**: Inventory & Warehouse Modules
- [ ] **Phase 4**: Request Module Development
- [ ] **Phase 5**: Version Management & Issue Tracking
- [ ] **Phase 6**: Enhanced Automation & Integration
- [ ] **Phase 7**: Testing & Quality Assurance
- [ ] **Phase 8**: Deployment & Monitoring

## 🤝 Contributing

Please read our [Contributing Guide](./CONTRIBUTING.md) for details on our code of conduct and development process.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions, please create an issue in the GitHub repository or contact the development team.
