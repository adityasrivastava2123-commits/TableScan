# TableScan

QR-based restaurant ordering platform for seamless customer experiences.

## Features

- **QR Code Ordering**: Customers scan QR codes at tables to view menus and place orders
- **Real-time Order Management**: Live orders board with status tracking
- **Menu Builder**: Create and manage restaurant menus with categories and items
- **Table Management**: Generate QR codes for tables and manage seating
- **Reports Dashboard**: Track revenue, orders, and performance insights
- **Staff Accounts**: Role-based access for admins, managers, waiters, and kitchen staff
- **Mobile Responsive**: Optimized for mobile devices with touch-friendly interfaces

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Authentication**: Clerk
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Pusher for live order updates
- **Payments**: Razorpay
- **UI Components**: shadcn/ui with Tailwind CSS
- **Charts**: Recharts for analytics

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- Clerk account (for authentication)
- Razorpay account (for payments)
- Pusher account (for real-time features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/tablescan.git
cd tablescan
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your values:
- `DATABASE_URL`: Your PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key
- `CLERK_SECRET_KEY`: Clerk secret key
- `RAZORPAY_KEY_ID`: Razorpay key ID
- `RAZORPAY_KEY_SECRET`: Razorpay key secret
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`: Razorpay publishable key
- `PUSHER_APP_ID`: Pusher app ID
- `PUSHER_APP_KEY`: Pusher app key
- `PUSHER_APP_SECRET`: Pusher app secret
- `PUSHER_CLUSTER`: Pusher cluster
- `NEXT_PUBLIC_PUSHER_APP_KEY`: Pusher public app key
- `NEXT_PUBLIC_PUSHER_CLUSTER`: Pusher cluster
- `NEXT_PUBLIC_APP_URL`: Your app URL (http://localhost:3000 for local)

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add all environment variables from your `.env` file
4. Click Deploy

After deployment:
- Update `NEXT_PUBLIC_APP_URL` to your Vercel URL
- Add your Vercel URL to Clerk allowed origins
- Add your Vercel URL to Razorpay allowed origins

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   ├── [slug]/            # Customer-facing pages
│   └── api/               # API routes
├── components/            # React components
│   ├── dashboard/         # Dashboard components
│   ├── customer/          # Customer-facing components
│   ├── menu/              # Menu components
│   ├── orders/            # Order components
│   └── ui/                # shadcn/ui components
└── lib/                   # Utility functions
```

## License

MIT
