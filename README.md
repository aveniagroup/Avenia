# AI Helpdesk Platform

A modern, enterprise-grade customer support and ticketing platform with intelligent AI-powered automation capabilities.

## Overview

This platform provides comprehensive ticket management with advanced AI features including autonomous agents, sentiment analysis, priority suggestions, and automated responses. Built for scalability and enterprise teams.

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing-fast development
- **Tailwind CSS** for styling with custom design system
- **shadcn/ui** component library
- **TanStack Query** for data fetching
- **TipTap** rich text editor
- **i18next** for internationalization

### Backend & Database
- **PostgreSQL** with Row Level Security (RLS)
- **Edge Functions** for serverless logic
- Multi-database support (Supabase, PostgreSQL, MySQL)

### AI Integration
- Multi-agent AI system powered by:
  - Google Gemini 2.5 Flash
  - OpenAI GPT-4
  - Claude (Anthropic)
- Autonomous ticket triage and resolution
- Quality assurance validation

## Features

### Ticket Management
- Complete CRUD operations for tickets
- Priority and status management
- Customer information tracking
- Conversation history and notes
- File attachments
- Activity logging and audit trails

### AI Capabilities
- **Autonomous AI Agents**: Multi-agent system with triage, resolution, and quality assurance
- **Response Suggestions**: AI-powered response recommendations
- **Sentiment Analysis**: Automatic sentiment detection
- **Priority Suggestions**: Smart priority recommendations
- **Translation**: Multi-language support
- **Knowledge Base**: Context-aware suggestions
- **Summarization**: Conversation and ticket summaries
- **PII Detection**: Automatic detection and anonymization of sensitive data

### Team Collaboration
- Team member management
- Role-based access control
- Real-time updates
- Internal notes and mentions

### Security & Compliance
- Two-factor authentication (2FA)
- IP whitelisting
- Audit logging
- GDPR/CCPA compliance tools
- Data retention policies
- Consent management
- PII detection and anonymization

### Storage Abstraction
- Pluggable storage backend
- Support for multiple database providers
- Seamless migration between providers
- Connection pooling and optimization

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (optional for self-hosted)

### Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd <project-directory>
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Configuration

### Database Setup

The platform supports multiple database backends. Configure your preferred provider in the storage configuration.

### AI Configuration

Configure AI providers and models in the Settings → AI Features section of the application.

### Authentication

Set up authentication providers and configure security settings in Settings → Security.

## Project Structure

```
├── src/
│   ├── components/       # React components
│   ├── pages/           # Page components
│   ├── lib/             # Utilities and libraries
│   │   └── storage/     # Storage abstraction layer
│   ├── hooks/           # Custom React hooks
│   ├── i18n/            # Internationalization
│   └── integrations/    # External integrations
├── supabase/
│   └── functions/       # Edge functions
└── public/              # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Internationalization

The platform supports multiple languages:
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Finnish (fi)
- Swedish (sv)

Add new translations in `src/i18n/locales/`

## Security

- All API keys and secrets should be stored in environment variables
- Enable 2FA for all team members
- Configure IP whitelisting for sensitive environments
- Regular security audits are recommended
- PII detection and anonymization is enabled by default

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For issues, questions, or feature requests, please contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: 2025
