# S3-Compatible Storage API Documentation

This API provides S3-compatible endpoints for object storage operations.

## Base URL

`http://localhost:8787` (Development)
`https://storage.yourdomain.com/api` (Production)

## Authentication

Most endpoints require AWS-style authentication using Access Key and Secret Key.
Some endpoints (like Pre-Signed URLs) use query parameters for authentication.

## Endpoints

### Service Operations

#### List Buckets
- **GET** `/`
- **Description**: Returns a list of all buckets owned by the authenticated user.
- **Auth**: Required (AWS Signature v4)

### Bucket Operations

#### Create Bucket
- **PUT** `/:bucket`
- **Description**: Creates a new bucket.
- **Auth**: Required

#### Delete Bucket
- **DELETE** `/:bucket`
- **Description**: Deletes an empty bucket.
- **Auth**: Required

#### List Objects
- **GET** `/:bucket`
- **Description**: Lists objects in a bucket.
- **Query Params**:
  - `prefix`: Filter by prefix
  - `delimiter`: Group by delimiter (e.g., `/`)
  - `max-keys`: Max number of keys to return
  - `marker`: Pagination marker
- **Auth**: Required

#### Get Bucket Policy
- **GET** `/buckets/:name/policy`
- **Description**: Returns the bucket policy JSON.
- **Auth**: Required (Admin/Owner)

#### Set Bucket Policy
- **PUT** `/buckets/:name/policy`
- **Description**: Sets the bucket policy.
- **Body**: JSON Policy Document
- **Auth**: Required (Admin/Owner)

### Object Operations

#### Put Object
- **PUT** `/:bucket/:key`
- **Description**: Uploads an object.
- **Headers**:
  - `x-amz-meta-*`: Custom metadata
  - `Content-Type`: MIME type
  - `x-amz-server-side-encryption`: `AES256` (SSE-S3)
- **Auth**: Required

#### Get Object
- **GET** `/:bucket/:key`
- **Description**: Downloads an object.
- **Auth**: Required (unless public by policy)

#### Head Object
- **HEAD** `/:bucket/:key`
- **Description**: Retrieves object metadata.
- **Auth**: Required

#### Delete Object
- **DELETE** `/:bucket/:key`
- **Description**: Deletes an object.
- **Auth**: Required

#### Copy Object
- **PUT** `/:bucket/:key`
- **Headers**:
  - `x-amz-copy-source`: `source-bucket/source-key`
  - `x-amz-metadata-directive`: `COPY` or `REPLACE`
- **Auth**: Required

### Multipart Upload

#### Initiate Multipart Upload
- **POST** `/:bucket/:key?uploads`
- **Description**: Starts a multipart upload.
- **Returns**: `UploadId`
- **Auth**: Required

#### Upload Part
- **PUT** `/:bucket/:key?partNumber=1&uploadId=...`
- **Description**: Uploads a part.
- **Returns**: `ETag`
- **Auth**: Required

#### Complete Multipart Upload
- **POST** `/:bucket/:key?uploadId=...`
- **Description**: Assembles uploaded parts.
- **Body**: XML list of parts and ETags.
- **Auth**: Required

#### Abort Multipart Upload
- **DELETE** `/:bucket/:key?uploadId=...`
- **Description**: Cancels upload and deletes parts.
- **Auth**: Required

### Pre-Signed URLs

#### Generate URL
- **POST** `/presigned-url`
- **Description**: Generates a temporary access URL.
- **Body**:
  - `bucket`: Bucket name
  - `key`: Object key
  - `operation`: `GET` or `PUT`
  - `expiresIn`: Seconds until expiration
- **Auth**: Required

## Error Responses

Errors are returned in XML format compatible with AWS S3 clients.

```xml
<Error>
    <Code>NoSuchKey</Code>
    <Message>The specified key does not exist.</Message>
    <Key>example.txt</Key>
    <RequestId>...</RequestId>
    <HostId>...</HostId>
</Error>
```
