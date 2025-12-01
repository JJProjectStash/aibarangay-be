# iBarangay Backend API

RESTful API backend for the iBarangay Online Services Platform.

## Features

- User authentication with JWT
- Role-based access control (Resident, Staff, Admin)
- Complaint management system
- Service request handling
- Event management with registration
- Announcements and news
- Notifications system
- Audit logging for admin actions
- PDF report generation
- Input validation and sanitization
- Public endpoints for guest access
- Dedicated health check endpoint

## Tech Stack

- **Node.js** - Runtime environment (ES Modules)
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM (v8+)
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **PDFKit** - PDF generation
- **Morgan** - HTTP request logger
- **CORS** - Cross-origin resource sharing

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env` file

```bash
cp .env.example .env
```

### 3. Configure environment variables

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ibarangay
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
```

### 4. Start the server

```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

## NPM Scripts

| Script              | Description                                |
| ------------------- | ------------------------------------------ |
| `npm start`         | Start server in production mode            |
| `npm run dev`       | Start server with nodemon (auto-reload)    |
| `npm run seed`      | Seed database with full demo data          |
| `npm run seed:demo` | Seed only demo user accounts               |
| `npm run wipe`      | Wipe all data (keeps collection structure) |

## Database Scripts

### Seed Full Demo Data

Seeds complete demo data including users, complaints, events, announcements, etc.

```bash
npm run seed
```

### Seed Demo Accounts Only

Creates only the 3 demo user accounts without other data:

```bash
npm run seed:demo
```

**Demo Accounts:**
| Role | Email | Password |
|------|-------|----------|
| Resident | resident@ibarangay.com | password123 |
| Staff | staff@ibarangay.com | password123 |
| Admin | admin@ibarangay.com | password123 |

### Wipe Database

Clears all documents but preserves collection structure and indexes:

```bash
npm run wipe
```

## API Endpoints

### Health Check

```
GET    /api/health             - API health status (always available)
```

### Authentication

```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login user
GET    /api/auth/me            - Get current user (Protected)
PUT    /api/auth/profile       - Update profile (Protected)
```

### Complaints

```
GET    /api/complaints         - Get user's complaints (Protected)
POST   /api/complaints         - Create complaint (Protected)
PUT    /api/complaints/:id/status - Update status (Staff/Admin)
POST   /api/complaints/:id/comments - Add comment (Protected)
PUT    /api/complaints/:id/feedback - Add feedback/rating (Protected)
```

### Services

```
GET    /api/services           - Get user's service requests (Protected)
POST   /api/services           - Create service request (Protected)
PUT    /api/services/:id/status - Update status (Staff/Admin)
```

### Events

```
GET    /api/events             - Get events (Protected)
POST   /api/events             - Create event (Staff/Admin)
POST   /api/events/:id/register - Register for event (Protected)
DELETE /api/events/:id         - Delete event (Staff/Admin)
```

### Announcements

```
GET    /api/announcements      - Get announcements (Protected)
PUT    /api/announcements/:id/pin - Toggle pin (Staff/Admin)
```

### News

```
GET    /api/news               - Get news items (Public)
POST   /api/news               - Create news (Staff/Admin)
DELETE /api/news/:id           - Delete news (Staff/Admin)
```

### Notifications

```
GET    /api/notifications      - Get user notifications (Protected)
PUT    /api/notifications/:id/read - Mark as read (Protected)
PUT    /api/notifications/read-all - Mark all as read (Protected)
```

### Content Management

```
GET    /api/content/hotlines   - Get hotlines (Public)
POST   /api/content/hotlines   - Create hotline (Staff/Admin)
DELETE /api/content/hotlines/:id - Delete hotline (Staff/Admin)

GET    /api/content/officials  - Get officials (Public)
POST   /api/content/officials  - Create official (Staff/Admin)
DELETE /api/content/officials/:id - Delete official (Staff/Admin)

GET    /api/content/faqs       - Get FAQs (Public)
POST   /api/content/faqs       - Create FAQ (Staff/Admin)
DELETE /api/content/faqs/:id   - Delete FAQ (Staff/Admin)
```

### Admin

```
GET    /api/admin/users        - Get all users (Admin)
DELETE /api/admin/users/:id    - Delete user (Admin)
GET    /api/admin/audit-logs   - Get audit logs (Admin)
GET    /api/admin/settings     - Get site settings (Public)
PUT    /api/admin/settings     - Update site settings (Admin)
```

### Statistics

```
GET    /api/stats              - Get dashboard stats (Protected)
GET    /api/stats/analytics    - Get analytics (Staff/Admin)
GET    /api/stats/report       - Generate PDF report (Staff/Admin)
```

### Public Endpoints (No Authentication Required)

These endpoints are accessible without login, ideal for landing pages and guest users:

```
GET    /api/public/events       - Get all events
GET    /api/public/announcements - Get published announcements
GET    /api/public/news         - Get all news items
GET    /api/public/officials    - Get barangay officials
GET    /api/public/settings     - Get site settings
```

## Validation Rules

### User Registration

- **Email**: Valid email format, unique
- **Password**: Min 8 characters, must contain uppercase, lowercase, and number
- **First/Last Name**: 2-50 characters, letters/spaces/dots/dashes only
- **Phone**: 11 digits, starts with 09
- **Address**: Max 200 characters

### Complaints

- **Title**: 5-150 characters
- **Description**: 10-1000 characters
- **Category**: Must be one of predefined categories
- **Priority**: low, medium, high, urgent

### Service Requests

- **Item Name**: 2-100 characters
- **Item Type**: Equipment or Facility
- **Borrow Date**: Cannot be in the past
- **Return Date**: Must be on or after borrow date
- **Purpose**: 10-500 characters

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `413` - Payload Too Large
- `500` - Internal Server Error

Error Response Format:

```json
{
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific error message"
    }
  ]
}
```

## Security

- JWT tokens for authentication
- Password hashing with bcrypt (10 rounds)
- Role-based access control
- Input validation and sanitization
- CORS configuration
- Request body size limits (5MB)
- Audit logging for sensitive operations

## Database Models

### User

- firstName, lastName, email, password
- role (resident, staff, admin)
- avatar, address, phoneNumber
- isVerified, idDocumentUrl
- Timestamps

### Complaint

- userId, title, description, category
- status, priority, assignedTo
- feedback, rating, attachments
- history array, comments array
- Timestamps

### ServiceRequest

- userId, itemName, itemType
- borrowDate, expectedReturnDate
- status, purpose, notes
- rejectionReason, approvalNote
- Timestamps

### Event

- title, description, eventDate, location
- organizerId, maxAttendees, currentAttendees
- category, imageUrl, status
- registeredUsers array
- Timestamps

### AuditLog

- userId, action, resource
- status, ipAddress
- Timestamp

## Development

### Project Structure

```
├── config/
│   └── db.js              # MongoDB connection
├── middleware/
│   ├── auth.js            # JWT auth & role authorization
│   └── errorHandler.js    # Global error handler
├── models/
│   ├── User.js
│   ├── Complaint.js
│   ├── ServiceRequest.js
│   ├── Event.js
│   ├── Announcement.js
│   ├── Notification.js
│   ├── NewsItem.js
│   ├── Hotline.js
│   ├── Official.js
│   ├── FAQ.js
│   ├── SiteSettings.js
│   └── AuditLog.js
├── routes/
│   ├── auth.js
│   ├── complaints.js
│   ├── services.js
│   ├── events.js
│   ├── announcements.js
│   ├── notifications.js
│   ├── news.js
│   ├── content.js
│   ├── admin.js
│   ├── stats.js
│   └── public.js          # Public/guest endpoints
├── scripts/
│   ├── seed.js            # Full database seeder
│   ├── seedDemo.js        # Demo accounts only
│   └── wipe.js            # Database wipe utility
├── utils/
│   ├── createAuditLog.js
│   ├── createNotification.js
│   └── generateToken.js
├── server.js              # Express app entry point
└── serverHealth.js        # Standalone health server
```

### Logging

Morgan is configured for development logging. Request logs appear in the console when `NODE_ENV=development`.

### Environment Variables

| Variable      | Description               | Default               |
| ------------- | ------------------------- | --------------------- |
| `NODE_ENV`    | Environment mode          | development           |
| `PORT`        | Server port               | 5000                  |
| `MONGODB_URI` | MongoDB connection string | -                     |
| `JWT_SECRET`  | JWT signing secret        | -                     |
| `CLIENT_URL`  | Frontend URL for CORS     | http://localhost:5173 |
| `HEALTH_PORT` | Health server port        | 5001                  |

## Deployment

### Production Checklist

1. Set `NODE_ENV=production`
2. Use a strong, unique `JWT_SECRET`
3. Configure MongoDB Atlas or production database
4. Set `CLIENT_URL` to your frontend domain
5. Enable HTTPS via reverse proxy (nginx)
6. Use PM2 for process management:
   ```bash
   pm2 start server.js --name aibarangay-be
   ```
7. Set up monitoring and logging

### Quick Production Start

```bash
NODE_ENV=production PORT=5000 npm start
```

## Contributing

1. Follow the existing code style (ES Modules)
2. Add validation for all inputs
3. Include proper error handling
4. Update documentation for new endpoints
5. Test thoroughly before submitting PR

## License

ISC
