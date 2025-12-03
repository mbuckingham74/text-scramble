<div align="center">

# Word Twist

### A modern web-based word puzzle game

[![Play Now](https://img.shields.io/badge/Play%20Now-twist.tachyonfuture.com-4a90d9?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBvbHlnb24gcG9pbnRzPSI1IDMgMTkgMTIgNSAyMSA1IDMiPjwvcG9seWdvbj48L3N2Zz4=)](https://twist.tachyonfuture.com)

![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

<br/>

*Unscramble letters. Find words. Beat the clock.*

</div>

---

## About the Game

Word Twist presents you with 6 scrambled letters and challenges you to find all valid English words (3-6 letters) that can be formed from them. The letters are always derived from a valid 6-letter word, so there's always at least one full solution.

### Game Modes

| Mode | Description |
|------|-------------|
| **Timed** | Race against the clock with 2 minutes per round |
| **Untimed** | Take your time and find every word |

### Controls

| Key | Action |
|-----|--------|
| `A-Z` | Type letters |
| `Enter` | Submit word |
| `Space` | Shuffle letters |
| `Backspace` | Delete last letter |
| `Tab` | Clear selection |

### Scoring

| Word Length | Points |
|-------------|--------|
| 3 letters | 30 pts |
| 4 letters | 45 pts |
| 5 letters | 60 pts |
| 6 letters | 75 pts |

> **Tip:** Find at least one 6-letter word to advance to the next level!

---

## Tech Stack

<table>
<tr>
<td align="center" width="150">
<img src="https://cdn.simpleicons.org/react/61DAFB" width="48" height="48" alt="React" />
<br><strong>React</strong>
<br><sub>Frontend</sub>
</td>
<td align="center" width="150">
<img src="https://cdn.simpleicons.org/express/000000" width="48" height="48" alt="Express" />
<br><strong>Express</strong>
<br><sub>Backend API</sub>
</td>
<td align="center" width="150">
<img src="https://cdn.simpleicons.org/mysql/4479A1" width="48" height="48" alt="MySQL" />
<br><strong>MySQL 8</strong>
<br><sub>Database</sub>
</td>
<td align="center" width="150">
<img src="https://cdn.simpleicons.org/redis/DC382D" width="48" height="48" alt="Redis" />
<br><strong>Redis</strong>
<br><sub>Rate Limiting</sub>
</td>
<td align="center" width="150">
<img src="https://cdn.simpleicons.org/docker/2496ED" width="48" height="48" alt="Docker" />
<br><strong>Docker</strong>
<br><sub>Deployment</sub>
</td>
</tr>
</table>

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for full stack)
- MySQL 8 (if running without Docker)

### Quick Start with Docker

```bash
# Clone and run
git clone https://github.com/mbuckingham74/text-scramble.git
cd text-scramble

# Set up environment
cp .env.example .env
# Edit .env with your JWT_SECRET

# Launch
docker compose up -d --build
```

### Development Setup

```bash
# Install dependencies
cd frontend && npm install
cd ../backend && npm install

# Start backend (Terminal 1)
cd backend && npm run dev

# Start frontend (Terminal 2)
cd frontend && npm start
```

The frontend runs on `http://localhost:3000` and proxies API requests to the backend on port 3001.

### Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `JWT_SECRET` | Yes | Secret key for JWT tokens |
| `DB_HOST` | Yes | MySQL host |
| `DB_USER` | Yes | MySQL username |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_NAME` | Yes | MySQL database name |
| `REDIS_URL` | No | Redis URL for rate limiting |
| `NODE_ENV` | No | Set to `production` for prod |

```bash
# Generate a secure JWT secret
openssl rand -base64 32
```

---

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

---

## API Reference

| Method | Endpoint | Auth | Description |
|:------:|----------|:----:|-------------|
| `GET` | `/api/puzzle` | | Generate a new puzzle |
| `POST` | `/api/validate` | | Validate a word submission |
| `POST` | `/api/solutions` | | Get all valid words for letters |
| `POST` | `/api/register` | | Register a new user |
| `POST` | `/api/login` | | User login |
| `POST` | `/api/scores` | Required | Submit a score |
| `GET` | `/api/leaderboard` | | Get top 10 scores per mode |
| `GET` | `/api/scores/me` | Required | Get current user's scores |

---

## Security Features

- JWT authentication for score submission
- Redis-backed rate limiting with automatic fallback
- Zod input validation on all endpoints
- CORS restricted to approved origins
- bcrypt password hashing (10 rounds)
- Multi-proxy chain support (Cloudflare/NPM)

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**[Play Word Twist](https://twist.tachyonfuture.com)**

*Inspired by the classic Text Twist game*

</div>
