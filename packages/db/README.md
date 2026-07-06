# Database Package

This package contains the first database schema slice for the `3s design` commerce platform.

Current scope:

- Users and profiles
- Products
- Product variants
- Product assets
- Licenses
- Product-specific license prices
- Categories
- Tags
- Product attributes for flexible filtering
- Cart and checkout
- Orders and order item snapshots
- Payments and webhook events
- Entitlements and protected downloads
- Coupons, refund requests, and refunds
- Wishlist, reviews, search events, and product analytics
- Fraud events, rate-limit logs, audit logs, and support tickets

Status-like fields are intentionally stored as `text` for now. Business validation should live in shared `Zod` schemas until the product rules settle enough to promote stable fields to Postgres enums.

Current licensing assumption: products are reusable digital designs sold to multiple customers. The current database slice does not model exclusive buyouts.
