# TableScan Documentation

Welcome to TableScan - QR-based digital menu and ordering system for modern restaurants.

## Table of Contents

- [Getting Started](#getting-started)
- [For Restaurant Owners](#for-restaurant-owners)
- [For Customers](#for-customers)
- [Kitchen Display System](#kitchen-display-system)
- [Features](#features)
- [Troubleshooting](#troubleshooting)
- [Support](#support)

## Getting Started

### Sign Up

1. Visit [tablescan.com](https://tablescan.com)
2. Click "Start Free Trial"
3. Enter your restaurant details
4. Verify your email address
5. Complete onboarding setup

### Dashboard Overview

After signing up, you'll be redirected to the dashboard where you can:
- View live orders
- Manage menu items
- Track table status
- Access analytics
- Manage staff

## For Restaurant Owners

### Setting Up Your Restaurant

#### 1. Add Menu Items

1. Navigate to **Menu** from the sidebar
2. Click **Add Item**
3. Fill in item details:
   - Name
   - Description
   - Price
   - Category
   - Image
   - Dietary information (veg/non-veg)
4. Click **Save**

#### 2. Create Categories

1. Go to **Menu > Categories**
2. Click **Add Category**
3. Enter category name
4. Click **Save**

#### 3. Manage Tables

1. Navigate to **Tables**
2. Click **Add Table**
3. Enter table number/name
4. Generate QR code
5. Print QR code and place it on the table

#### 4. Configure Payment

1. Go to **Settings > Payment**
2. Add your Razorpay API keys
3. Configure payment methods
4. Save settings

### Managing Orders

#### View Orders

1. Navigate to **Orders**
2. View all orders in a table format
3. Filter by status, date, or search
4. Click on an order to view details

#### Order Status Flow

Orders follow this status flow:
- **NEW** - Order placed by customer
- **PREPARING** - Kitchen is preparing the order
- **READY** - Order is ready to serve
- **DONE** - Order has been served
- **CANCELLED** - Order was cancelled

### Kitchen Display System (KDS)

The KDS is designed for kitchen staff to manage orders efficiently.

#### Features

- **Real-time Order Display**: Orders appear instantly when placed
- **Priority Sorting**: Orders sorted by priority and wait time
- **Chef Assignment**: Assign chefs to specific orders
- **Item-Level Tracking**: Mark individual items as complete
- **Timer Display**: Countdown timers for each order
- **Delayed Warnings**: Visual alerts for orders taking longer than estimated
- **Kitchen Load Indicator**: Shows current kitchen capacity

#### Using KDS

1. Navigate to **Kitchen** or **KDS**
2. View all active orders
3. Click on an order to:
   - Update stage (RECEIVED → PREPARING → READY → SERVED)
   - Assign chef
   - Mark items as complete
   - Add notes
4. Orders auto-sort by priority and wait time

### Analytics

Access analytics from the **Dashboard**:

- **Revenue Today**: Total revenue for the day
- **Orders**: Number of orders processed
- **Average Order Value**: Average amount per order
- **Pending Orders**: Orders not yet completed

### Staff Management

1. Go to **Staff**
2. Click **Add Staff Member**
3. Enter staff details
4. Assign role (Admin, Manager, Kitchen Staff, Waiter)
5. Click **Save**

## For Customers

### Placing an Order

1. Scan the QR code at your table
2. Browse the digital menu
3. Add items to cart
4. Review order
5. Proceed to checkout
6. Enter customer details (optional)
7. Select payment method
8. Complete payment
9. Track order status in real-time

### Tracking Order Status

After placing an order:
- View status updates in real-time
- Status changes: Order Received → Being Prepared → Ready → Served
- Estimated preparation time displayed
- Notifications when status changes

### Multiple Orders

If you place multiple orders:
- Switch between orders using the order selector
- Track each order independently
- View combined receipt

## Kitchen Display System

The Kitchen Display System (KDS) helps kitchen staff manage orders efficiently.

### Order Stages

- **RECEIVED**: Order just placed, not yet started
- **PREPARING**: Currently being prepared
- **READY**: Prepared and ready to serve
- **SERVED**: Delivered to customer

### Priority Levels

- **URGENT**: Highest priority, prepare immediately
- **HIGH**: High priority, prepare soon
- **NORMAL**: Standard priority
- **LOW**: Lowest priority

### Features

- Auto-sorting by priority and wait time
- Estimated preparation time with countdown
- Delayed order warnings
- Kitchen capacity indicator
- Chef assignment
- Item-level completion tracking

## Features

### QR Ordering
- Scan and order instantly
- No app download required
- Works on any device

### Real-time Updates
- Instant order notifications
- Live status tracking
- Pusher-powered real-time sync

### Kitchen Display System
- Visual order management
- Priority-based sorting
- Timer and alerts

### Analytics
- Revenue tracking
- Order analytics
- Performance metrics

### Multi-Location Support
- Manage multiple restaurants
- Centralized dashboard
- Location-specific settings

## Troubleshooting

### QR Code Not Working

- Ensure QR code is printed clearly
- Check internet connection
- Verify table is active in dashboard
- Try rescanning the QR code

### Order Not Appearing in KDS

- Check internet connection
- Verify Pusher is configured
- Refresh the KDS page
- Check order status in Orders page

### Payment Failed

- Verify Razorpay keys are correct
- Check payment method is enabled
- Ensure sufficient funds
- Try again or contact support

### Dashboard Not Loading

- Clear browser cache
- Check internet connection
- Try different browser
- Contact support if issue persists

## Support

### Contact Support

- Email: support@tablescan.com
- Phone: +91-XXX-XXX-XXXX
- Live chat: Available in dashboard

### Documentation Updates

Documentation is regularly updated. Check back for new features and improvements.

### Feedback

We value your feedback! Share your thoughts through:
- Dashboard feedback form
- Email to feedback@tablescan.com
- In-app rating system

---

**TableScan** - Transforming restaurant operations with QR-based ordering.
