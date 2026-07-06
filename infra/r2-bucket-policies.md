# R2 bucket policies

Use separate prefixes and lifecycle policies for product assets:

- `products/*/previews/*`: public preview assets, keep indefinitely.
- `products/*/watermarked-previews/*`: public protected previews, keep indefinitely.
- `products/*/deliveries/*`: private paid delivery bundles, keep indefinitely with backups.
- `products/*/sources/*`: private source files, keep indefinitely with backups.
- `tmp/uploads/*`: incomplete uploads, delete after 24 hours.

Recommended bucket CORS for signed uploads:

```json
[
  {
    "AllowedOrigins": ["https://YOUR_DOMAIN", "http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type", "content-length", "x-amz-checksum-sha256"],
    "ExposeHeaders": ["etag", "x-amz-checksum-sha256"],
    "MaxAgeSeconds": 300
  }
]
```

Production rule: signed upload URLs should be short-lived, asset metadata must be recorded only after upload verification, and delivery URLs must never be public.
