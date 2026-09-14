# Backend

The backend is intentionally kept as a small Node/Express service so the project can boot with only:

```bash
npm install
npm start
```

`server.js` contains the API and static-file server. Runtime data is persisted in `data/db.json`, and uploaded document bytes are stored in `storage/` and are never exposed as a public static directory.

The API implements:

- bcrypt password hashing
- httpOnly SameSite session cookies
- server-side session revocation
- role-based access control
- append-style audit records
- document upload/download/delete
- persistent medicines, appointments, family, alerts, and health-profile data
- admin separation from medical endpoints

For production, migrate the persistence layer to PostgreSQL/Prisma or another managed database and replace local document storage with private object storage plus signed URLs.
