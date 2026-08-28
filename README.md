# Orange Payment API

Backend API for handling Orange VFX payments and masterclass bookings.

## Features

* Flutterwave payment verification
* Masterclass booking processing
* ClickUp task creation
* Customer confirmation emails
* Booking validation and logging

## Tech Stack

* Node.js
* TypeScript
* Express.js
* Flutterwave API
* ClickUp API
* Email service

## Setup

```bash
npm install
```

Create a `.env` file:

```env
PORT=3000

FLUTTERWAVE_SECRET_KEY=

CLICKUP_API_TOKEN=
CLICKUP_BOOKING_LIST_ID=

EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
npm start
```

## API

### Create Booking

```http
POST /api/bookings
```

The API verifies the Flutterwave transaction before creating the booking and sending the confirmation email.
