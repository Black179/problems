# Problem Tracker Application

A full-stack web application for collecting and managing user problem submissions with an admin dashboard.

## Features

✨ **User Features:**
- Submit problem reports with name, contact, status, field, and description
- Form validation for required fields
- Clean, modern UI with Bootstrap 5

✨ **Admin Features:**
- View all problem submissions in a table
- Filter by field and status
- Sort by date or name
- View detailed problem information
- Delete submissions
- Pagination for large datasets

## Tech Stack

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- CORS enabled for frontend communication

**Frontend:**
- HTML5, CSS3, JavaScript (Vanilla)
- Bootstrap 5 for UI components
- Responsive design

## Project Structure

```
problem-tracker/
├── backend/
│   ├── models/
│   │   └── Problem.js          # MongoDB schema for problems
│   ├── routes/
│   │   └── problems.js         # API routes
│   ├── server.js               # Express server setup
│   ├── package.json            # Backend dependencies
│   └── .env                    # Environment variables
└── frontend/
    ├── index.html              # Problem submission form
    ├── admin.html              # Admin dashboard
    ├── app.js                  # Form logic
    ├── admin.js                # Admin dashboard logic
    └── styles.css              # Custom styles
```

## Setup Instructions

### 1. MongoDB Setup

**Option A: MongoDB Atlas (Cloud - Recommended)**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Get your connection string
4. Update `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/problemTracker
   ```

**Option B: Local MongoDB**

1. Download [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Install and start MongoDB service
3. The default `.env` configuration will work:
   ```
   MONGODB_URI=mongodb://localhost:27017/problemTracker
   ```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Start the Backend Server

```bash
npm start
```

The server will run on `http://localhost:3000`

### 4. Open the Frontend

Open the following files in your browser:

- **User Form**: `frontend/index.html`
- **Admin Dashboard**: `frontend/admin.html`

## API Endpoints

### Submit a Problem
```
POST /api/problems
Content-Type: application/json

{
  "name": "John Doe",
  "contactNo": "+1234567890",
  "status": "Working",
  "field": "Technology",
  "problem": "Description of the problem"
}
```

### Get All Problems
```
GET /api/problems?field=Technology&status=Working&sortBy=createdAt&sortOrder=desc
```

### Get Single Problem
```
GET /api/problems/:id
```

### Delete Problem
```
DELETE /api/problems/:id
```

## Environment Variables

Create a `.env` file in the `backend` directory:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/problemTracker
NODE_ENV=development
```

## Usage

### Submitting a Problem

1. Open `index.html` in your browser
2. Fill in all required fields:
   - Full Name
   - Contact Number
   - Status (Working/Student/Neither)
   - Field/Area
   - Problem Description
3. Click "Submit Problem"
4. You'll see a success message

### Admin Dashboard

1. Open `admin.html` in your browser
2. View all submissions in a table
3. Use filters to narrow down results:
   - Filter by Field
   - Filter by Status
   - Sort by date or name
4. Click "View" to see full problem details
5. Click delete icon to remove a submission

## Development

To run in development mode with auto-restart:

```bash
cd backend
npm run dev
```

## Security Notes

- The application uses CORS to allow frontend-backend communication
- Input validation is performed on both frontend and backend
- Contact numbers are sanitized to prevent XSS
- MongoDB injection protection via Mongoose

## Future Enhancements

- [ ] User authentication for admin panel
- [ ] Email notifications on new submissions
- [ ] Export data to CSV/Excel
- [ ] Add status updates (Open/In Progress/Resolved)
- [ ] File attachment support
- [ ] Advanced search functionality

## Troubleshooting

**"Connection refused" error:**
- Ensure MongoDB is running
- Check the MongoDB URI in `.env`

**"CORS error" in browser console:**
- Ensure the backend server is running on port 3000
- Check that CORS is enabled in `server.js`

**Form submission not working:**
- Open browser console to check for errors
- Verify the API endpoint URL in `app.js` matches your backend URL

## License

MIT License - feel free to use this project for learning or production use.

## Support

For issues or questions, please refer to the documentation or create an issue in the repository.
