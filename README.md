# Privet Chat - Vercel Deployment Ready

A privacy-focused, self-destructing chat application with end-to-end encryption, real-time messaging, and zero data retention. Built with Next.js, TypeScript, and Upstash Redis.

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/privet-chat)

## Features

### Core Features
- **Ephemeral Chat Rooms**: Rooms automatically expire after a configurable time (5 min to 24 hours)
- **End-to-End Encryption**: Optional AES-256 encryption for all messages
- **Two-User Limit**: Each room supports exactly 2 participants maximum
- **Self-Destruct**: Users can manually destroy rooms, permanently deleting all messages
- **Anonymous Identity**: Auto-generated usernames stored only in localStorage

### Security & Privacy
- **Password Protection**: Optional password protection for rooms
- **Rate Limiting**: IP-based and user-based rate limiting to prevent abuse
- **No Message Storage**: Messages exist only in Redis memory with automatic expiration
- **Secure Cookies**: HTTP-only, secure, same-site cookies for authentication

### Enhanced Messaging
- **Real-time Messaging**: Instant message delivery using Upstash Realtime (WebSocket)
- **Message Reactions**: React to messages with emojis
- **Read Receipts**: See when messages are read
- **Message Editing**: Edit messages within 5 minutes
- **Message Deletion**: Delete your own messages within 5 minutes
- **Typing Indicators**: See when the other user is typing
- **Markdown Support**: Basic markdown formatting (bold, italic, code)
- **Emoji Picker**: Built-in emoji selector

### User Experience
- **Sound Notifications**: Optional audio alerts for new messages
- **Push Notifications**: Browser notifications when tab is not focused
- **QR Code Sharing**: Generate QR codes for easy mobile room joining
- **Custom Expiration**: Choose room lifetime from 5 minutes to 24 hours
- **Multi-language Support**: English, Spanish, Russian, Thai
- **Dark Terminal Aesthetic**: Green/amber terminal-style interface
- **Mobile Responsive**: Works on all screen sizes
- **Accessibility**: Full keyboard navigation, screen reader support, ARIA labels

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16.1.4 (App Router) |
| **Runtime** | Bun |
| **Language** | TypeScript 5 |
| **Frontend** | React 19.2.3 |
| **Styling** | Tailwind CSS 4 |
| **Database/Cache** | Upstash Redis |
| **Real-time** | Upstash Realtime |
| **API Framework** | Elysia.js with Eden Treaty |
| **Validation** | Zod 4.3.6 |
| **State Management** | TanStack React Query 5.90.20 |
| **Encryption** | crypto-js (AES-256) |
| **QR Codes** | qrcode |
| **Markdown** | react-markdown |
| **Emojis** | emoji-picker-react |

## Deployment

### Prerequisites
- Bun runtime (v1.0+)
- Upstash Redis account
- Vercel account (for deployment)

### Environment Variables

Create a `.env.local` file:

```env
UPSTASH_REDIS_REST_URL="https://your-redis-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"
```

### Deploy to Vercel

1. **One-Click Deploy**: Click the "Deploy with Vercel" button above

2. **Manual Deploy**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login
   vercel login
   
   # Deploy
   vercel
   ```

3. **Set Environment Variables in Vercel**:
   - Go to Project Settings → Environment Variables
   - Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - Redeploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## Local Development

```bash
# Install dependencies
bun install

# Run development server
bun dev

# Open http://localhost:3000
```

## API Documentation

### Room Management
- `POST /api/room/create` - Create a new room
- `POST /api/room/verify-password` - Verify room password
- `GET /api/room/ttl` - Get room time remaining
- `DELETE /api/room` - Destroy room and all messages

### Messages
- `GET /api/messages` - Get all messages in room
- `POST /api/messages` - Send a message
- `PUT /api/messages/:messageId` - Edit a message
- `DELETE /api/messages/:messageId` - Delete a message
- `POST /api/messages/:messageId/reactions` - Add/remove reaction
- `POST /api/messages/:messageId/read` - Mark message as read

### Typing Indicators
- `POST /api/typing` - Update typing status
- `GET /api/typing` - Get active typing users

See full documentation in [README.md](./README.md).

## Architecture

### Room Lifecycle
1. **Creation**: User creates room via API with optional settings
2. **Access**: Proxy validates room exists and checks capacity
3. **Authentication**: Cookie-based token system for room access
4. **Messaging**: Real-time pub/sub via Upstash Realtime
5. **Expiration**: Automatic Redis TTL cleanup

### Data Flow
```
User → Next.js App → Elysia API → Upstash Redis
                ↓
         Upstash Realtime (WebSocket)
                ↓
              Other User
```

## Security Model
- **Transport**: HTTPS for all communications
- **Encryption**: Optional AES-256 client-side encryption
- **Authentication**: Cryptographic tokens in HTTP-only cookies
- **Rate Limiting**: Multi-layered (IP, user, room)
- **Data Retention**: Automatic expiration, no persistent storage

## Rate Limits

- **Messages**: 15 per minute per user
- **Room Creation**: 10 per hour per IP
- **General Requests**: 50 per minute per IP

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes (Elysia)
│   ├── lib/           # Utilities (Redis, Realtime, Client)
│   ├── room/          # Room page
│   ├── page.tsx       # Home page
│   ├── layout.tsx     # Root layout
│   └── globals.css    # Global styles
├── components/        # React components
├── hooks/            # Custom hooks
├── lib/              # Shared utilities (E2EE, Rate Limit)
└── dictionaries/     # i18n translations
```

## Scripts

- `bun dev` - Start development server
- `bun build` - Build for production
- `bun start` - Start production server
- `bun lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Real-time powered by [Upstash Realtime](https://upstash.com/)
- Redis hosting by [Upstash Redis](https://upstash.com/)
- Encryption by [crypto-js](https://github.com/brix/crypto-js)

---

**Note**: This application is designed for privacy and ephemeral communication. All data is automatically deleted when rooms expire. Keep your encryption keys safe!

## Support

For issues, questions, or suggestions, please open an issue on GitHub.
