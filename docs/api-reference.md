# V2 Capsule API Reference

## Base URL
`http://localhost:8787`

## Authentication
All endpoints (except Auth and S3 Public) require a Bearer Token.
`Authorization: Bearer <token>`

## Auth

### POST /auth/signup
Create a new user. First user becomes Super Admin.
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### POST /auth/login
Login and get a token.
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

## Users (Super Admin Only)

### GET /users
List all users.

### POST /users
Create a new user.
**Body:**
```json
{
  "email": "new@example.com",
  "password": "password",
  "role": "user"
}
```

### DELETE /users/:id
Delete a user.

## Volumes (Super Admin Only)

### GET /volumes
List all storage volumes.

### POST /volumes
Add a storage volume.
**Body:**
```json
{
  "name": "disk2",
  "path": "/mnt/disk2"
}
```

### DELETE /volumes/:id
Remove a volume.

## S3 Compatible API
Standard S3 endpoints are supported at the root level.
- `GET /` (List Buckets)
- `PUT /:bucket` (Create Bucket)
- `PUT /:bucket/:key` (Put Object)
- `GET /:bucket/:key` (Get Object)
- `DELETE /:bucket/:key` (Delete Object)
