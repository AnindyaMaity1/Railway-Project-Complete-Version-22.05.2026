# Railway Track QR Code Management System

## 1. The problem it solves

This project transforms manual railway track fitting management into a digital, AI-assisted workflow. It allows operators to:

- generate and attach laser-marked QR codes to track fittings such as rail clips, pads, liners, and sleepers
- scan QR codes using mobile devices for instant part identification
- track inventory, vendor details, and installation history centrally
- automate inspection reports and monitor quality with AI analytics
- improve safety by reducing manual record-keeping and minimizing human error

In short, the system makes track maintenance faster, more reliable, and easier to audit.

## 2. Challenges We ran into

- **Database configuration mismatch:** The backend initially attempted to use `DATABASE_URL` even when it pointed to a SQLite path, causing MongoDB connection errors. I fixed this by validating the connection string and falling back to `MONGO_URI` when needed.
- **Integration complexity:** Coordinating the React frontend, Node.js backend, Python AI service, and decision copilot service required careful environment setup and cross-service URL handling.
- **Mobile scanning reliability:** Ensuring camera-based QR scanning worked across different devices meant adding robust client-side handling for camera permission, image capture, and QR decoding.
- **Deployment readiness:** Preparing the project for deployment involved documenting environment variables, fill-in `.env` files, and consistent startup scripts for both local development and hosted environments.

## 3. Technology Used

- **Frontend:** React.js, HTML5, CSS3, Bootstrap, Progressive Web App (PWA)
- **Backend:** Node.js, Express.js, Socket.io
- **Database:** MongoDB (Atlas / local MongoDB)
- **AI Services:** Python, OpenCV, TensorFlow
- **Authentication:** JWT-based auth with role-based access
- **Dev tooling:** npm, nodemon, concurrently
- **Deployment support:** Render, Docker, environment variable configuration
