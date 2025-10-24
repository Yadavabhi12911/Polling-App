# Polling App with AI Assistant

A modern polling application built with React, TypeScript, Vite, and Supabase, featuring an AI-powered chatbot for poll creation and voting.

## Features

### For Regular Users
- **View Active Polls**: Browse all currently active polls with real-time vote counts
- **AI-Powered Voting**: Use the chatbot to vote on polls through natural language
- **Poll Results**: See live results and statistics for all polls
- **User-Friendly Interface**: Clean, intuitive design for easy navigation

### For Admin Users
- **Create Polls**: Use the AI assistant to create polls step-by-step
- **Manage Polls**: Update, delete, or close existing polls
- **View Analytics**: Access detailed poll results and statistics
- **Admin Dashboard**: Comprehensive admin panel for poll management

### AI Assistant Capabilities
- **Poll Creation**: Guide users through creating polls with questions and options
- **Voting Assistance**: Help users vote on polls using natural language
- **Results Display**: Show poll results and statistics
- **File Support**: Upload images, PDFs, or documents to enhance polls
- **Role-Based Access**: Different capabilities based on user role (admin vs regular user)

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (Database + Authentication)
- **AI**: Google Gemini AI for chatbot functionality
- **Charts**: Recharts for data visualization
- **File Processing**: PDF.js, Mammoth.js for document handling

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Create a `.env` file with:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

## User Roles

### Regular Users
- Access: `/app/user-polls` - View and vote on active polls
- Features: View poll results, vote through AI assistant
- Navigation: Simple interface focused on voting

### Admin Users  
- Access: `/app/polling` - Full poll management interface
- Features: Create, update, delete polls; view detailed analytics
- Navigation: Advanced admin dashboard

## AI Assistant Usage

### For Voting
1. Navigate to `/app/chat-bot`
2. Ask to see active polls: "Show me active polls"
3. Vote on a poll: "I want to vote on poll [ID] for option [1-4]"
4. The AI will process your vote and confirm submission

### For Poll Creation (Admin)
1. Navigate to `/app/chat-bot` as an admin
2. Start creating: "I want to create a poll"
3. Follow the AI's step-by-step guidance
4. Upload files if needed (images, PDFs, documents)

## Project Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   ├── ChatBot.tsx   # AI assistant interface
│   ├── Polling.tsx   # Admin poll management
│   ├── Navigation.tsx # App navigation
│   └── Layout.tsx    # Main layout wrapper
├── pages/
│   ├── UserPolling.tsx # User poll viewing interface
│   ├── AdminDashboard.tsx
│   └── ...
├── utils/
│   └── geminiModel.ts # AI integration logic
└── routes/
    └── myRoutes.tsx   # Application routing
```

## Key Features Implemented

✅ **User Poll Viewing**: Users can see all active polls with real-time results  
✅ **AI Voting**: Users can vote through natural language with the chatbot  
✅ **Role-Based Access**: Different interfaces for admin and regular users  
✅ **Real-Time Updates**: Live poll results and vote counts  
✅ **File Support**: Upload images and documents to enhance polls  
✅ **Responsive Design**: Works on desktop and mobile devices  
✅ **Navigation**: Easy navigation between different app sections  

## Recent Updates

- Added user-specific polling interface (`/app/user-polls`)
- Implemented AI-powered voting functionality
- Created role-based navigation and access control
- Enhanced chatbot with voting capabilities
- Added real-time poll result display for users
- Improved user experience with dedicated user interface
