# EduGuide - College Guidance Platform

A comprehensive web application that helps students navigate their college journey with AI-powered guidance, tutoring support, and personalized recommendations.

## 🎓 Features

### Core Functionality
- **AI Chat Assistant**: Get personalized college recommendations and guidance
- **User Authentication**: Secure registration and login with Supabase
- **Interactive Dashboard**: Centralized hub for college exploration
- **Demo Mode**: Try the platform without registration

### Tutoring & Support
- **Tutoring Support Requests**: Submit detailed requests for academic help
- **Subject Coverage**: Math, Science, English, Computer Science, and more
- **Priority Levels**: Low, Medium, High priority request handling
- **File Upload Support**: Attach supporting documents to requests

### User Management
- **Comprehensive Profiles**: Store academic background and preferences
- **Multi-step Registration**: Collect detailed student information
- **Route Protection**: Secure access to authenticated features
- **Session Management**: Persistent authentication state

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Authentication**: Supabase Auth (with demo mode fallback)
- **Database**: Supabase PostgreSQL
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion
- **Package Manager**: Bun
- **Deployment**: Vercel (Next.js hosting)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd college-guidance-platform
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   bun dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Schema

### User Profiles Table
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TEXT,
  current_school TEXT,
  school_type TEXT CHECK (school_type IN ('high_school', 'community_college', 'university', 'other')),
  graduation_year TEXT,
  high_school TEXT,
  high_school_grad_year TEXT
);
```

### Tutoring Requests Table
```sql
CREATE TABLE tutoring_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  file_url TEXT,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium'
);
```

## 🔐 Authentication

The application supports both production Supabase authentication and a demo mode for development:

- **Production**: Full Supabase Auth with email/password
- **Demo Mode**: Local authentication with localStorage fallback
- **Route Protection**: Protected routes automatically redirect to login
- **Session Management**: Persistent login state across browser sessions

## 🎨 UI Components

Built with shadcn/ui components including:
- Cards, Buttons, Forms, Inputs
- Select dropdowns, Badges, Alerts
- Navigation, Avatars, Scroll areas
- Loading spinners, Separators

## 📱 Pages & Routes

- `/` - Landing page with features and pricing
- `/register` - Multi-step user registration
- `/login` - User authentication
- `/dashboard` - Main dashboard with AI chat
- `/demo` - Demo chat with limited messages
- `/tutoring` - Tutoring services overview
- `/tutoring-support` - Submit tutoring requests (protected)

## 🔧 Development

### Scripts
```bash
bun dev          # Start development server
bun build        # Build for production
bun start        # Start production server
bun lint         # Run linter
bun format       # Format code
```

### Project Structure
```
src/
├── app/                 # Next.js app router
├── components/          # Reusable components
│   ├── ui/             # shadcn/ui components
│   └── auth/           # Authentication components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configurations
└── types/              # TypeScript type definitions
```

## 🚀 Deployment

The application is configured for Vercel deployment with Next.js server capabilities.

- **Vercel**: Automatic preview and production deployment from GitHub
- **Any Node.js host**: Run with `npm run build` and `npm run start`

### Build Configuration
```javascript
// next.config.js
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true }
};
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the React framework
- [Supabase](https://supabase.com/) for backend services
- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Framer Motion](https://www.framer.com/motion/) for animations
