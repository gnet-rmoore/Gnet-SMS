# Finance service

Domain microservice for **fees**, **fee templates**, **expenses**, and checkout.

## Models

- `FeePayment` — school invoices (`PENDING` | `PAID` | `VOIDED`)
- `FeeTemplate` — reusable fee schedules per school
- `Expense` — operational expenses

## Notable routes

| Method | Path | Notes |
| :--- | :--- | :--- |
| GET/POST | `/api/schools/:schoolId/fees` | List / create |
| PATCH | `/api/schools/:schoolId/fees/:id` | Edit pending |
| POST | `/api/schools/:schoolId/fees/:id/collect` | Staff mark paid |
| POST | `/api/schools/:schoolId/fees/:id/void` | Void pending |
| GET/POST/DELETE | `/api/schools/:schoolId/fee-templates` | Templates CRUD |
| GET | `/api/my-fees` | Student/parent portal |
| POST | `/api/fees/:id/checkout` | Stripe or console mock |
| POST | `/api/fees/:id/remind` | Logs reminder (no email yet) |

See `docs/FINANCE_BILLING_PLAN.md` for product behavior.
