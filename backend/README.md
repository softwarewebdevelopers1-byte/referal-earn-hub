# EarnHub backend

## Initial admin

Keep `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` in `backend/.env`.
When the `users` table is empty, startup creates that single regular `ADMIN`
account, hashes the password, and leaves existing users unchanged. The
password must be unique and at least eight characters; placeholder values are
rejected. Docker Compose reads this same file with
`docker compose --env-file backend/.env ...`.

## PayHero configuration

The application uses the PayHero v2 M-Pesa STK endpoint:

`POST https://backend.payhero.co.ke/api/v2/payments`

Set these environment variables (the backend imports `backend/.env` in local development, but credentials must remain outside source control):

```text
PAYHERO_ENABLED=true
PAYHERO_API_BASE=https://backend.payhero.co.ke/api/v2
PAYHERO_STK_PATH=/payments
PAYHERO_USERNAME=your_api_username
PAYHERO_PASSWORD=your_api_password
PAYHERO_CHANNEL_ID=your_numeric_channel_id
PAYHERO_CALLBACK_URL=https://your-public-https-host/api/payments/payhero/callback
```

PayHero documents Basic Auth and the request fields `amount` (integer), `phone_number`, `channel_id`, `provider: "m-pesa"`, `external_reference`, and `callback_url`. The configured amount is read from `ACTIVATION_AMOUNT`; the frontend cannot choose it.

The exact callback URL implemented by this service is:

`POST /api/payments/payhero/callback`

The legacy `/api/payments/callback` alias remains available for an already-configured deployment, but new PayHero configuration should use the `/payhero/callback` path. A tunnel must forward HTTPS traffic to the backend port (normally `localhost:8080`); no tunnel container is included.

## Payment status and access control

Authenticated users query their own payment with:

`GET /api/payments/{paymentReference}/status`

The frontend polls this endpoint from the pending-payment page. It redirects to `/dashboard` only when the response says both `paymentStatus: "SUCCESS"` and `canAccessDashboard: true`. Failed, pending, cancelled, review-required, and inconsistent records remain locked. Paid-only APIs also enforce this rule on the backend, so a URL or API request cannot bypass it.

This API is stateless and uses JWTs only in the `Authorization: Bearer <access-token>` header, so CSRF protection is disabled. Tokens are not stored in cookies. Do not move either token into a cookie without restoring CSRF protection.

Login and registration return a short-lived `accessToken` (also returned as the legacy `token` field) and a rotated `refreshToken`. Use `POST /api/auth/refresh` with `{ "refreshToken": "..." }` to rotate both tokens. Refresh tokens are hashed in MySQL, locked during rotation, and revoked after use. The access-token JWT is the only JWT accepted by protected APIs.

## Callback verification limitation

The published PayHero callback documentation provides the nested response fields (`Amount`, `ExternalReference`, `CheckoutRequestID`, `MerchantRequestID`, `MpesaReceiptNumber`, `Phone`, `ResultCode`, and `Status`) but does not describe a callback signature, HMAC, or shared-secret header. The service therefore does not claim cryptographic webhook authenticity. It accepts a successful callback only after correlating the stored merchant reference, exact configured amount, initiated phone (when supplied), checkout request ID (when supplied), and the documented successful `Status` plus `ResultCode: 0`. Ambiguous callbacks are recorded as `REVIEW_REQUIRED`; they never activate an account. Confirm with PayHero whether your account/version supports an additional signed webhook before treating this as cryptographic verification.

Callback retries are safe because payment rows are locked during processing, successful activation is transactional, payment/referral ledger references are unique, and referral earnings have unique payment/referee constraints.

## Local callback test

With the backend running and a real pending reference in MySQL, send a documented-shaped callback through the tunnel. Replace the reference and amount with the values stored in the payment row:

```bash
curl -i -X POST "$PAYHERO_CALLBACK_URL" \
  -H 'Content-Type: application/json' \
  -d '{
    "forward_url": "",
    "response": {
      "Amount": 5,
      "CheckoutRequestID": "provider-checkout-id",
      "ExternalReference": "PAY-your-reference",
      "MerchantRequestID": "provider-merchant-id",
      "MpesaReceiptNumber": "TEST-RECEIPT",
      "Phone": "+254700000000",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "Status": "Success"
    },
    "status": true
  }'
```

Do not use this curl example as proof of a real payment: it is only a parser/integration test and must not be used against a production account to unlock an account. Automated tests mock PayHero and never initiate real payments.

## Verification commands

```bash
cd backend
./mvnw test
./mvnw clean verify

cd ../frontend
npm ci
npm run typecheck
npm run build
```
