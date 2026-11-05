# Booking confirmation popup

The car-detail **Chọn thuê** button opens a second dialog instead of creating a booking immediately. Its desktop layout follows the inspected Mioto confirmation popup: centered title, vehicle summary, two-column rental times, pickup address, owner, rental requirements, price calculation and equal-width cancel/submit actions. BonBon keeps its yellow accent and existing typography.

## Data and behavior

- `POST /api/bookings/quote` supplies the authoritative price, weekly discount, mileage allowance, rental terms and availability. Loading, unavailable and error states prevent submission; errors offer a quote retry.
- Only the final **Gửi yêu cầu thuê xe** action calls `POST /api/bookings`, with the vehicle ID and rental window, never a client-supplied price or payment status. A synchronous ref guards duplicate clicks.
- Successful creation navigates to `/my-trips`; failures stay in the confirmation dialog. Guests are prompted to log in without discarding the selected vehicle or rental window.
- Cancel/backdrop/Escape close the confirmation only. The detail dialog remains underneath and is inert while confirmation is open. Keyboard focus is contained and restored; motion respects reduced-motion preferences.
- Owner names use catalog data rather than a hardcoded demo fleet. Insurance, partial deposits, payment-on-pickup and owner messaging are intentionally omitted because these are not supported BonBon workflows. No database change is required.

## Verification

Run `npm run test:booking`, `npm run typecheck`, and `npm run build`.

For isolated browser verification, run `node tools/booking-confirmation-preview.mjs`, then run Vite on port 5174 with `VITE_API_URL=http://127.0.0.1:5199/api`. The fixture binds loopback only, uses synthetic accounts and in-memory bookings, and is not imported into the application. It accepts arbitrary local test login values; never expose this fixture server publicly or enter real credentials into it.

Browser checks cover cancel/Escape, guest login, daily weekly discounts, hourly pricing without a weekly discount, quote failure/retry, unavailable vehicles, submission errors and successful navigation. Production deployment and a real booking/payment transaction are not part of this verification.
