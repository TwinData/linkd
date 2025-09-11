# LinKD - Financial Transaction Management System

## Project Overview

LinKD is a comprehensive financial transaction management system built for handling client transactions, float deposits, promotions, and MPESA transaction fee calculations. The application supports role-based access control with admin and user roles.

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn-ui components
│   ├── AppSidebar.tsx   # Application sidebar navigation
│   ├── Seo.tsx          # SEO meta tags component
│   └── TransactionCharges.tsx # MPESA transaction charges management
├── context/             # React context providers
│   └── AuthProvider.tsx # Authentication context
├── hooks/               # Custom React hooks
├── integrations/        # External service integrations
│   └── supabase/        # Supabase configuration and types
├── layouts/             # Page layout components
│   └── AppLayout.tsx    # Main application layout
├── pages/               # Application pages
│   ├── Dashboard.tsx    # Main dashboard
│   ├── Clients.tsx      # Client management
│   ├── Transactions.tsx # Transaction management
│   ├── FloatDeposits.tsx # Float deposit management
│   ├── Promotions.tsx   # Promotions management
│   ├── Reports.tsx      # Analytics and reports
│   ├── Settings.tsx     # Application settings
│   └── Users.tsx        # User management (admin only)
├── utils/               # Utility functions
│   ├── transactionCharges.ts # Transaction fee calculations
│   └── csvUtils.ts      # CSV import/export utilities
└── main.tsx            # Application entry point
```

## Features

### Core Functionality
- **Client Management**: Add, edit, and manage client information
- **Transaction Processing**: Handle KD to KES currency exchanges with automatic fee calculation
- **Float Deposit Management**: Track and manage float deposits with Sarah's share calculations
- **Promotions System**: Create and manage promotional offers
- **User Management**: Role-based access control (Admin/User)
- **Reports & Analytics**: Comprehensive transaction analysis and reporting

### MPESA Integration
- **Transaction Fee Calculation**: Automatic calculation based on transaction type and amount
- **Dual Rate Structure**: Support for both MPESA Send Money and Paybill rates
- **Real-time Fee Updates**: Dynamic fee calculation based on current rate tables

### Data Management
- **CSV Import/Export**: Bulk transaction import and data export capabilities
- **PDF Export**: Generate PDF reports for transactions
- **Real-time Updates**: Live data synchronization across all components

**Project URL**: https://lovable.dev/projects/8c58591c-6660-49fa-ac69-b7cd1ce65068

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/8c58591c-6660-49fa-ac69-b7cd1ce65068) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Deployment

### Deploying to Netlify

This project is configured for easy deployment to Netlify with the included `netlify.toml` configuration file.

#### Prerequisites
1. A Netlify account
2. A Supabase project with the database configured

#### Deployment Steps

1. **Fork or Clone** this repository to your GitHub account

2. **Connect to Netlify**:
   - Log in to your Netlify dashboard
   - Click "New site from Git"
   - Connect your GitHub account and select this repository
   - Netlify will automatically detect the build settings from `netlify.toml`

3. **Configure Environment Variables** in Netlify:
   - Go to Site settings → Environment variables
   - Add the following variables:
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - Get these values from your Supabase project settings

4. **Deploy**:
   - Click "Deploy site"
   - Netlify will build and deploy your application automatically

#### Build Configuration

The project uses the following build settings (defined in `netlify.toml`):
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: 18
- **SPA redirects**: Configured for React Router
- **Asset caching**: Optimized for static assets

#### Environment Variables

Create a `.env` file based on `.env.example`:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Alternative Deployment Options

#### Lovable Platform
Simply open [Lovable](https://lovable.dev/projects/8c58591c-6660-49fa-ac69-b7cd1ce65068) and click on Share → Publish.

#### Other Platforms
The application can also be deployed to:
- Vercel
- Railway
- DigitalOcean App Platform
- Any platform supporting Node.js applications

## Custom Domain Setup

### Netlify Custom Domain
1. Go to your Netlify site dashboard
2. Navigate to Site settings → Domain management
3. Click "Add custom domain"
4. Follow the DNS configuration instructions

### Lovable Custom Domain
Navigate to Project > Settings > Domains and click Connect Domain.
Read more: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
