# iBarangay Backend API

RESTful API backend for the iBarangay Online Services Platform.

## Features

- User authentication with JWT
- Role-based access control (Resident, Staff, Admin)
- Complaint management system
- Service request handling
- Event management
- Announcements and news
- Audit logging
- PDF report generation
- Input validation and sanitization

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **PDFKit** - PDF generation
- **Morgan** - HTTP request logger
- **CORS** - Cross-origin resource sharing

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ibarangay
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
```

4. Seed the database (optional):
```bash
npm run seed
```

5. Start the server:
```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login user
GET    /api/auth/me            - Get current user (Protected)
PUT    /api/auth/profile       - Update profile (Protected)
```

### Complaints
```
GET    /api/complaints         - Get complaints (Protected)
POST   /api/complaints         - Create complaint (Protected)
PUT    /api/complaints/:id/status - Update status (Staff/Admin)
POST   /api/complaints/:id/comments - Add comment (Protected)
```

### Services
```
GET    /api/services           - Get service requests (Protected)
POST   /api/services           - Create service request (Protected)
PUT    /api/services/:id/status - Update status (Staff/Admin)
```

### Events
```
GET    /api/events             - Get events (Protected)
POST   /api/events             - Create event (Staff/Admin)
POST   /api/events/:id/register - Register for event (Protected)
GET    /api/events/:id/registered - Get registered users (Staff/Admin)
DELETE /api/events/:id         - Delete event (Admin)
```

### Announcements
```
GET    /api/announcements      - Get announcements (Protected)
PUT    /api/announcements/:id/pin - Toggle pin (Staff/Admin)
```

### News
```
GET    /api/news               - Get news (Protected)
POST   /api/news               - Create news (Staff/Admin)
DELETE /api/news/:id           - Delete news (Admin)
```

### Content Management
```
GET    /api/content/hotlines   - Get hotlines (Protected)
POST   /api/content/hotlines   - Create hotline (Staff/Admin)
DELETE /api/content/hotlines/:id - Delete hotline (Admin)

GET    /api/content/officials  - Get officials (Protected)
POST   /api/content/officials  - Create official (Staff/Admin)
DELETE /api/content/officials/:id - Delete official (Admin)

GET    /api/content/faqs       - Get FAQs (Protected)
POST   /api/content/faqs       - Create FAQ (Staff/Admin)
DELETE /api/content/faqs/:id   - Delete FAQ (Admin)
```

### Admin
```
GET    /api/admin/users        - Get all users (Admin)
DELETE /api/admin/users/:id    - Delete user (Admin)
GET    /api/admin/audit-logs   - Get audit logs (Admin)
GET    /api/admin/settings     - Get site settings (Admin)
PUT    /api/admin/settings     - Update site settings (Admin)
```

### Statistics
```
GET    /api/stats              - Get dashboard stats (Protected)
GET    /api/stats/analytics    - Get analytics (Staff/Admin)
GET    /api/stats/report       - Generate PDF report (Staff/Admin)
```

### Public Endpoints (No Auth Required)
```
GET    /api/public/events      - Get public events
GET    /api/public/announcements - Get public announcements
GET    /api/public/news        - Get public news
GET    /api/public/officials   - Get barangay officials
GET    /api/public/settings    - Get site settings
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

### Seeding Database
```bash
npm run seed
```

This creates:
- 3 demo users (admin, staff, resident)
- Sample complaints
- Sample service requests
- Sample events
- Sample announcements

### Logging
Morgan is configured for development logging. In production, consider using a more robust logging solution.

### Environment Variables
Always use environment variables for sensitive data:
- Database URIs
- JWT secrets
- API keys
- Email credentials

## Deployment

1. Set `NODE_ENV=production`
2. Use a strong JWT_SECRET
3. Configure MongoDB Atlas or production database
4. Set up proper CORS origins
5. Enable HTTPS
6. Consider using PM2 for process management
7. Set up monitoring and logging

## Testing

```bash
npm test
```

## Contributing

1. Follow the existing code style
2. Add validation for all inputs
3. Include error handling
4. Update documentation
5. Test thoroughly before submitting PR

## License

ISC