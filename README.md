# CineMax S3 Storage

A production-ready S3-compatible object storage system with advanced features including multipart uploads, versioning, encryption, bucket policies, and event notifications.

## 🚀 Quick Start

### One-Click Deployment
```bash
# Windows
.\deploy-complete.bat

# Linux/Mac
chmod +x deploy-complete.sh
./deploy-complete.sh
```

### Access
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8787
- **Remote (Tailscale)**: https://your-machine.tail-name.ts.net

## 📁 Project Structure

```
V2 Capsule/
├── backend/              # Hono API server
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   ├── db/          # Database & migrations
│   │   └── index.ts     # Entry point
│   ├── drizzle/         # Database migrations
│   └── Dockerfile
│
├── frontend/            # Next.js web application
│   ├── src/
│   │   ├── app/         # Pages & layouts
│   │   ├── components/  # React components
│   │   └── lib/         # Utilities
│   └── Dockerfile
│
├── nginx/               # Reverse proxy config
├── docs/                # Documentation
├── storage_data/        # Uploaded files (gitignored)
├── docker-compose.yml   # Docker orchestration
└── .env                 # Environment variables

```

## ✨ Features

### Core S3 Features
- ✅ **Bucket Management** - Create, list, delete buckets
- ✅ **Object Operations** - Upload, download, delete objects
- ✅ **Multipart Upload** - Parallel chunk uploads for large files
- ✅ **Universal Smart Uploader** - Auto-detects file size, 3-4x faster
- ✅ **Pre-Signed URLs** - Temporary access links
- ✅ **Object Metadata** - Custom headers and metadata
- ✅ **Copy Objects** - Same/cross-bucket copying

### Advanced Features
- ✅ **Versioning** - Object version history
- ✅ **Server-Side Encryption** - AES-256 encryption
- ✅ **Bucket Policies** - Fine-grained access control
- ✅ **CORS Configuration** - Cross-origin resource sharing
- ✅ **Event Notifications** - Webhook notifications
- ✅ **Volume Management** - Multi-volume support

### Performance
- ✅ **Parallel Uploads** - 4 concurrent chunks
- ✅ **10MB Chunks** - 50% fewer API calls
- ✅ **Retry Logic** - Exponential backoff
- ✅ **Health Checks** - Automatic service monitoring

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18
- **Framework**: Hono (fast web framework)
- **Database**: PostgreSQL 14
- **ORM**: Drizzle ORM
- **Storage**: File system

### Frontend
- **Framework**: Next.js 14
- **UI**: React + shadcn/ui
- **Styling**: Tailwind CSS
- **State**: React Query

### DevOps
- **Containerization**: Docker + Docker Compose
- **Networking**: Tailscale (optional)
- **Reverse Proxy**: Nginx (optional)

## 📖 Documentation

- [Quick Start Guide](QUICKSTART.md) - Get started in 5 minutes
- [Docker Deployment](DOCKER_DEPLOYMENT.md) - Complete Docker guide
- [Tailscale Setup](TAILSCALE_SETUP.md) - Remote access configuration
- [Docker Optimization](DOCKER_OPTIMIZATION.md) - Build performance tips
- [API Documentation](docs/api_documentation.md) - API reference
- [Testing Plan](docs/testing_plan.md) - Feature testing guide
- [Walkthrough](docs/walkthrough.md) - Implementation details

## 🔧 Development

### Prerequisites
- Docker Desktop
- Node.js 18+ (for local development)
- PostgreSQL 14+ (for local development)

### Local Development
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start backend
cd backend
npm run dev

# Start frontend
cd frontend
npm run dev
```

### Environment Variables
Copy `.env.example` to `.env` and update:
```bash
DATABASE_URL=postgresql://user:password@postgres:5432/cinemax_storage
JWT_SECRET=your-secret-key
ENCRYPTION_MASTER_KEY=your-64-char-hex-key
```

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

## 🌐 Tailscale (Remote Access)

```bash
# Windows
.\setup-tailscale.bat

# Linux/Mac
./setup-tailscale.sh
```

Access your app from anywhere with automatic HTTPS!

## 🧹 Cleanup

```bash
# Windows
.\cleanup.bat

# Linux/Mac
chmod +x cleanup.sh
./cleanup.sh
```

Removes build artifacts, nested git repos, and prepares for monorepo.

## 📊 Performance

| Feature | Performance |
|---------|-------------|
| Upload Speed (parallel) | 3-4x faster than sequential |
| API Overhead | 50% reduction (10MB chunks) |
| Build Time | 5-8 minutes (first), 30s (cached) |
| Docker Image Size | ~200MB (multi-stage build) |

## 🔒 Security

- JWT authentication
- AES-256 encryption
- Bucket policies
- CORS configuration
- Pre-signed URLs with expiration
- Environment-based secrets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with Hono, Next.js, and Drizzle ORM
- Inspired by AWS S3 API
- Docker optimization techniques from community

## 📞 Support

- Documentation: See `/docs` folder
- Issues: GitHub Issues
- Discussions: GitHub Discussions

---

**Made with ❤️ for CineMax Plaza**

🚀 **Ready to deploy? Run `deploy-complete.bat` and get started!**
