# Rating App

## Overview

A comprehensive full-stack web application designed for rating and managing local stores. The platform facilitates community-driven reviews, providing distinct tools and interfaces for standard users, store owners, and platform administrators.

**Live Demo**: https://www.ratingapp.online

## Features

- **User Authentication**: Secure sign up, login, and password recovery utilizing One-Time Passwords (OTP).
- **Role-based Access Control**: Distinct capabilities and dashboards for Users, Store Owners, and Admins.
- **Store Rating System**: Enables users to evaluate stores, assign ratings, and submit detailed feedback.
- **Store Management**: Allows store owners to monitor their average ratings, view recent reviews, and update store details.
- **Admin Panel**: Centralized dashboard for managing all platform users, stores, and moderation.
- **Responsive Design**: Highly optimized, mobile-friendly interface built with Tailwind CSS and Framer Motion.

## Technology Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Framer Motion (Animations)
- React Router (Routing)
- Axios (HTTP Client)
- Lucide React (Icons)

### Backend
- Node.js
- Express.js
- PostgreSQL with Sequelize ORM
- JWT (JSON Web Tokens) Authentication
- Bcrypt (Password Hashing)
- Resend (Email Delivery for OTPs)
- Express Rate Limiting

## Project Structure

```text
Rating-App/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   └── utils/
│   ├── app.js
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL Database
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Swapnil454/rating-app.git
cd rating-app
```

2. **Install dependencies**
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. **Environment Configuration**

Create a `.env` file in the `backend` directory with the following variables:
```env
POSTGRES_URI=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=8786
RESEND_API_KEY=your_resend_api_key
```

Create a `.env` file in the `frontend` directory with the following variables:
```env
VITE_API_URL=http://localhost:8786
```

4. **Run the application**

```bash
# Backend (from backend directory)
npm run dev

# Frontend (from frontend directory)
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/reset-password` - Reset password

### Users (Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Stores
- `GET /api/stores` - Get all stores
- `GET /api/stores/:id` - Get store by ID
- `POST /api/stores` - Create store (Admin only)
- `PUT /api/stores/:id` - Update store (Admin/Owner)
- `DELETE /api/stores/:id` - Delete store (Admin only)

### Ratings
- `GET /api/ratings` - Get all ratings
- `POST /api/ratings` - Create rating
- `PUT /api/ratings/:id` - Update rating
- `DELETE /api/ratings/:id` - Delete rating

## User Roles

1. **User**: Can browse stores, submit ratings, and manage their own review history.
2. **Owner**: Can view rating analytics for their specific stores and manage store contact/location information.
3. **Admin**: Has full access to user management, store management, and system-wide administration.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions regarding the setup, please open an issue on the repository.


The browser reproduction found the root cause: TracePilotProvider injects analytics code that patches history.replaceState, then repeatedly triggers itself. The console shows Maximum update depth exceeded and the stack ends in the analytics replaceState patch; this is why the URL changes while route content lags. I’m checking the provider’s supported options for a non-invasive fix before removing observability from the app.

The script in `index.html` was an external analytics script:

```html
https://deployraai.onrender.com/analytics.js
```

Its actual effects were:

1. It monkey-patched `history.pushState` / `history.replaceState`.
2. React Router uses those same browser APIs for `<Link>` navigation.
3. The analytics script triggered tracking while React Router was changing the route.
4. This caused repeated history updates and React’s `Maximum update depth exceeded` error.
5. The browser URL changed, but React Router’s rendered page and active navbar link became stale.
6. It also generated CORS failures because requests included a `traceparent` header that the server did not allow.

There was also a separate issue in `TracePilotProvider`: its default CORS array was recreated on every render, causing its own render loop. That is why removing only the analytics script was not enough.

You can keep the script, but the remote `analytics.js` must be fixed to:

- Guard against recursive `pushState`/`replaceState` calls.
- Avoid replacing browser history unnecessarily.
- Add `traceparent` to the server’s allowed CORS headers.
- Track route changes without triggering another route change.

Until that remote script is corrected, keeping it in `index.html` will continue to interfere with React Router.

Yes. The application can feel heavy because multiple observability systems are running at the same time.

Main causes:

- `enableSessionReplay={true}` in `main.jsx:17` starts `rrweb`, which records DOM changes, clicks, typing events, scrolling, and form mutations.
- TracePilot instruments every `fetch` and `XMLHttpRequest`, adding tracing headers and processing network activity.
- The external `analytics.js` script also tracks page views and patches browser history. Running it together with TracePilot duplicates tracking.
- The previous infinite render loop caused continuous React updates, which can make typing and clicking extremely slow.
- Failed CORS requests may repeatedly attempt telemetry uploads.
- In development, `StrictMode` can run certain effects twice, making telemetry overhead more noticeable.

The biggest performance improvement is to disable session replay:

```jsx
enableSessionReplay={false}
```

You can still keep error and request tracing. For production, session replay should also be sampled or enabled only when debugging because recording every interaction is expensive, especially on forms. The external analytics script should remain removed until its history patch and CORS behavior are corrected.