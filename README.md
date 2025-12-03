# Word Twist

A web-based word game inspired by Text Twist. Unscramble letters to find as many words as possible!

**[Play Now](https://twist.tachyonfuture.com)**

## About the Game

Word Twist presents you with 6 scrambled letters and challenges you to find all valid English words (3-6 letters) that can be formed from them. The letters are always derived from a valid 6-letter word, so there's always at least one full solution.

### Game Modes

- **Timed Mode**: Race against the clock with 2 minutes per round
- **Untimed Mode**: Take your time and find every word

### How to Play

1. Click letters or type to form words
2. Press **Enter** to submit a word
3. Press **Space** to shuffle the letters
4. Press **Backspace** to delete the last letter
5. Press **Tab** to clear your current selection
6. Find at least one 6-letter word to advance to the next level!

### Scoring

Points are awarded based on word length:
- 3 letters: 30 points
- 4 letters: 45 points
- 5 letters: 60 points
- 6 letters: 75 points

## Tech Stack

- **Frontend**: React (Create React App)
- **Backend**: Node.js / Express
- **Database**: MySQL 8
- **Deployment**: Docker Compose with Nginx

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for full stack)
- MySQL 8 (if running without Docker)

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/mbuckingham74/text-scramble.git
   cd text-scramble
   ```

2. Install dependencies:
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the development servers:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   cd frontend && npm start
   ```

   The frontend runs on `http://localhost:3000` and proxies API requests to the backend on port 3001.

### Docker Deployment

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret key for JWT tokens |
| `DB_HOST` | Yes | MySQL host |
| `DB_USER` | Yes | MySQL username |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_NAME` | Yes | MySQL database name |
| `NODE_ENV` | No | Set to `production` for prod |

Generate a secure JWT secret:
```bash
openssl rand -base64 32
```

## Project Structure

```
word-twist/
├── frontend/           # React application
│   ├── src/
│   │   ├── App.js      # Main game component
│   │   ├── App.css     # Styles
│   │   └── sounds.js   # Sound effects
│   ├── Dockerfile
│   └── nginx.conf
├── backend/            # Express API
│   ├── src/
│   │   ├── index.js    # API endpoints
│   │   ├── game.js     # Game logic
│   │   ├── auth.js     # JWT authentication
│   │   └── words.txt   # Dictionary (29,771 words)
│   ├── init.sql        # Database schema
│   └── Dockerfile
├── docker-compose.yml
└── CLAUDE_CONTEXT.md   # Detailed project documentation
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/puzzle` | Generate a new puzzle |
| POST | `/api/validate` | Validate a word submission |
| POST | `/api/register` | Register a new user |
| POST | `/api/login` | User login |
| POST | `/api/scores` | Submit a score (auth required) |
| GET | `/api/leaderboard` | Get top 10 scores per mode |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by the classic Text Twist game
- Dictionary sourced from the Scrabble word list
