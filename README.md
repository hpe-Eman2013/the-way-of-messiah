# way-of-messiah-backend

## NPM Scripts

- `npm run start:dev`  
  Runs your dev script (e.g., with nodemon + .env.development).

- `npm run start:prod`  
  Runs your prod script (e.g., node + .env.production).

- `npm start`  
  Runs the "start" script specifically (many hosts expect this to be prod).

## Project Info

This is the backend for the Way of Messiah project.  
See `package.json` for dependencies and scripts.

## Stripe Info
stripe listen --forward-to localhost:10000/api/donations/webhook

## Health Checks
Router: GET /api/donations/ping
Create session: POST /api/donations/create-checkout-session
Thank-you lookup: GET /api/donations/session/:id