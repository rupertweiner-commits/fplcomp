# FPL Live Tracker

A real-time Fantasy Premier League data tracking application with live updates, deployed on Google Cloud Platform.

## Features

🚀 **Real-time Data Updates**
- Live gameweek scores and player performance
- WebSocket connections for instant updates
- Automatic polling during match days

📊 **Comprehensive Analytics**
- Player statistics and performance metrics
- League standings and rankings
- Manager analysis and team history
- Top performers tracking

🏆 **League Management**
- View any public league standings
- Track manager performance over time
- Historical data and trends

⚡ **Modern Tech Stack**
- React frontend with Tailwind CSS
- Node.js backend with Express
- WebSocket real-time communication
- Docker containerization
- Google Cloud Run deployment

## Architecture

Based on the [FPL API documentation](https://www.oliverlooney.com/blogs/FPL-APIs-Explained) by Oliver Looney, this application leverages all major FPL endpoints:

### Core API Endpoints
- `bootstrap-static/` - General information, teams, players
- `fixtures/` - Match fixtures and results
- `event/{id}/live/` - Live gameweek data
- `entry/{id}/` - Manager summaries
- `leagues-classic/{id}/standings/` - League standings
- `element-summary/{id}/` - Detailed player data

### Real-time Updates
- Scheduled polling every 2 minutes for general data
- Quick updates every 30 seconds during live matches
- WebSocket broadcasting to all connected clients
- Automatic detection of live gameweeks

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (for deployment)
- Google Cloud SDK (for GCP deployment)

### Local Development

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd fpl-live-tracker
   npm install
   cd client && npm install && cd ..
   ```

2. **Environment Setup**
   ```bash
   cp environment.example .env
   # Edit .env with your configuration
   ```

3. **Start Development Servers**
   ```bash
   # Terminal 1: Start backend
   npm run dev

   # Terminal 2: Start frontend
   cd client && npm start
   ```

4. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080/api/fpl
   - WebSocket: ws://localhost:8080

### Production Build

```bash
# Build frontend
npm run build

# Start production server
npm start
```

## Google Cloud Platform Deployment

### Method 1: Cloud Run (Recommended)

```bash
# Build and deploy using Cloud Build
gcloud builds submit --config cloudbuild.yaml

# Or deploy directly
gcloud run deploy fpl-live-tracker \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1
```

### Method 2: App Engine

```bash
# Deploy to App Engine
gcloud app deploy app.yaml
```

### Method 3: Manual Docker Deployment

```bash
# Build Docker image
docker build -t fpl-live-tracker .

# Run locally
docker run -p 8080:8080 fpl-live-tracker

# Deploy to Google Container Registry
docker tag fpl-live-tracker gcr.io/YOUR_PROJECT_ID/fpl-live-tracker
docker push gcr.io/YOUR_PROJECT_ID/fpl-live-tracker
```

## API Usage

### Public Endpoints

**Dashboard Data**
```javascript
fetch('/api/fpl/dashboard')
  .then(response => response.json())
  .then(data => console.log(data));
```

**Live Gameweek Data**
```javascript
fetch('/api/fpl/gameweek/1/live')
  .then(response => response.json())
  .then(data => console.log(data));
```

**League Standings**
```javascript
fetch('/api/fpl/league/314/standings')
  .then(response => response.json())
  .then(data => console.log(data));
```

### WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Live update:', data);
};
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `NODE_ENV` | Environment | `development` |
| `FRONTEND_URL` | CORS origin | `*` |
| `FPL_BASE_URL` | FPL API base URL | `https://fantasy.premierleague.com/api` |

### Docker Configuration

The application uses a multi-stage Docker build:
1. **Frontend Build** - Compiles React app
2. **Backend Build** - Installs Node.js dependencies
3. **Production** - Creates minimal runtime image

### Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting (configurable)
- Non-root Docker user
- Health checks

## Monitoring & Observability

### Health Check
```bash
curl http://localhost:8080/health
```

### Logs
The application provides structured logging:
- API request/response logging
- WebSocket connection tracking
- Error monitoring
- Performance metrics

### Metrics
- Connected WebSocket clients
- API response times
- Cache hit rates
- Update frequencies

## Troubleshooting

### Common Issues

**CORS Errors**
- Ensure `FRONTEND_URL` is set correctly
- Check browser console for specific CORS messages

**WebSocket Connection Failed**
- Verify port 8080 is accessible
- Check firewall settings
- Ensure WebSocket upgrades are allowed

**API Rate Limiting**
- FPL API has rate limits
- Application includes caching to minimize requests
- Monitor logs for 429 status codes

**Missing Data**
- Some endpoints require authentication for private data
- Public endpoints work without authentication
- Check FPL website availability

### Performance Optimization

**Backend**
- Implement Redis caching for better performance
- Use database for historical data storage
- Scale horizontally with multiple instances

**Frontend**
- Enable service worker for offline functionality
- Implement virtual scrolling for large datasets
- Use React.memo for expensive components

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [Oliver Looney](https://www.oliverlooney.com/blogs/FPL-APIs-Explained) for the comprehensive FPL API documentation
- Fantasy Premier League for providing the public API
- The FPL community for inspiration and feedback

## Support

For issues and questions:
1. Check the troubleshooting section
2. Search existing issues on GitHub
3. Create a new issue with detailed information
4. Join the community discussions

---

**Disclaimer**: This application is not affiliated with the Premier League or Fantasy Premier League. It uses publicly available data for educational and analytical purposes.
