# S3 Storage System - Testing Plan

## Overview
This document outlines the manual testing plan for all implemented S3 features.

## Testing Environment
- Backend: http://localhost:8787
- Frontend: http://localhost:3000
- Test Bucket: `test-bucket` (create if needed)

---

## 1. Head Object Testing

### Test Case 1.1: View Object Metadata
**Steps:**
1. Upload a file to a bucket
2. Click the "Info" button on the object
3. Verify metadata is displayed

**Expected Result:**
- Content-Type shown correctly
- Content-Length matches file size
- ETag displayed
- Last-Modified timestamp shown
- Custom metadata (if any) displayed

**Status:** ⏳ Pending

---

## 2. Pre-Signed URLs Testing

### Test Case 2.1: Generate GET Pre-Signed URL
**Steps:**
1. Navigate to bucket details
2. Click "Generate Pre-Signed URL" for an object
3. Select GET operation
4. Set expiration to 1 hour
5. Copy the generated URL
6. Open URL in new browser tab (incognito mode)

**Expected Result:**
- File downloads successfully
- No authentication required

**Status:** ⏳ Pending

### Test Case 2.2: Generate PUT Pre-Signed URL
**Steps:**
1. Generate pre-signed URL for PUT operation
2. Use curl or Postman to upload file:
```bash
curl -X PUT -T test-file.txt "PRESIGNED_URL"
```

**Expected Result:**
- File uploads successfully
- File appears in bucket

**Status:** ⏳ Pending

### Test Case 2.3: URL Expiration
**Steps:**
1. Generate pre-signed URL with 1 minute expiration
2. Wait 2 minutes
3. Try to access the URL

**Expected Result:**
- Access denied / Signature expired error

**Status:** ⏳ Pending

---

## 3. Multipart Upload Testing

### Test Case 3.1: Small File Upload (<5MB)
**Steps:**
1. Upload a file smaller than 5MB
2. Verify standard upload is used

**Expected Result:**
- File uploads successfully
- Standard upload dialog used

**Status:** ⏳ Pending

### Test Case 3.2: Large File Upload (>5MB)
**Steps:**
1. Upload a file larger than 5MB
2. Verify multipart uploader opens automatically
3. Monitor progress

**Expected Result:**
- Multipart uploader opens automatically
- Progress bar shows per-part progress
- File uploads successfully

**Status:** ⏳ Pending

### Test Case 3.3: Abort Multipart Upload
**Steps:**
1. Start uploading a large file
2. Click "Cancel" during upload

**Expected Result:**
- Upload aborts
- Partial data cleaned up
- No incomplete file in bucket

**Status:** ⏳ Pending

### Test Case 3.4: Retry Failed Parts
**Steps:**
1. Simulate network interruption during upload
2. Verify retry logic kicks in

**Expected Result:**
- Failed parts automatically retry
- Upload completes successfully

**Status:** ⏳ Pending

---

## 4. Copy Object Testing

### Test Case 4.1: Same-Bucket Copy
**Steps:**
1. Click "Copy" on an object
2. Keep same bucket selected
3. Enter new key name
4. Click "Copy"

**Expected Result:**
- Object copied successfully
- New object appears in bucket
- Original object unchanged

**Status:** ⏳ Pending

### Test Case 4.2: Cross-Bucket Copy
**Steps:**
1. Create second bucket
2. Copy object from bucket A to bucket B
3. Verify in both buckets

**Expected Result:**
- Object appears in destination bucket
- Original object unchanged

**Status:** ⏳ Pending

### Test Case 4.3: Metadata Preservation
**Steps:**
1. Copy object with "COPY" metadata directive
2. Check metadata of copied object

**Expected Result:**
- All metadata preserved from original

**Status:** ⏳ Pending

### Test Case 4.4: Metadata Replacement
**Steps:**
1. Copy object with "REPLACE" metadata directive
2. Provide new metadata
3. Check copied object metadata

**Expected Result:**
- New metadata applied
- Original metadata not copied

**Status:** ⏳ Pending

---

## 5. Server-Side Encryption Testing

### Test Case 5.1: Enable SSE-S3
**Steps:**
1. Go to bucket settings
2. Enable encryption
3. Select SSE-S3
4. Save changes
5. Upload a new file

**Expected Result:**
- File encrypted on server
- Encryption metadata in headers
- File decrypts automatically on download

**Status:** ⏳ Pending

### Test Case 5.2: SSE-C Upload
**Steps:**
1. Use curl to upload with customer key:
```bash
curl -X PUT -T file.txt \
  -H "x-amz-server-side-encryption-customer-algorithm: AES256" \
  -H "x-amz-server-side-encryption-customer-key: BASE64_KEY" \
  -H "x-amz-server-side-encryption-customer-key-MD5: MD5_HASH" \
  http://localhost:8787/bucket/key
```

**Expected Result:**
- File encrypted with provided key
- Cannot download without correct key

**Status:** ⏳ Pending

### Test Case 5.3: Key Rotation
**Steps:**
1. Go to bucket settings
2. Open Key Management
3. Click "Rotate Key"
4. Confirm rotation

**Expected Result:**
- New key generated
- Existing objects re-encrypted (if implemented)

**Status:** ⏳ Pending

---

## 6. Bucket Policy Testing

### Test Case 6.1: Public Read Policy
**Steps:**
1. Go to bucket policy page
2. Load "Public Read Access" example
3. Save policy
4. Try to access object without authentication

**Expected Result:**
- Object accessible publicly
- Can download without credentials

**Status:** ⏳ Pending

### Test Case 6.2: Deny Upload Policy
**Steps:**
1. Load "Deny Upload (Read-Only)" policy
2. Save policy
3. Try to upload a file
4. Try to download a file

**Expected Result:**
- Upload fails with 403 AccessDenied
- Download succeeds

**Status:** ⏳ Pending

### Test Case 6.3: IP-Based Restriction
**Steps:**
1. Load "IP-Based Access Control" policy
2. Update IP ranges to exclude your IP
3. Try to access bucket

**Expected Result:**
- Access denied from non-whitelisted IPs

**Status:** ⏳ Pending

---

## 7. CORS Testing

### Test Case 7.1: Configure CORS
**Steps:**
1. Go to bucket CORS settings
2. Add CORS rule:
   - Allowed Origins: http://localhost:3000
   - Allowed Methods: GET, PUT
   - Allowed Headers: *
3. Save configuration

**Expected Result:**
- CORS headers returned in responses
- Cross-origin requests succeed

**Status:** ⏳ Pending

---

## 8. Versioning Testing

### Test Case 8.1: Enable Versioning
**Steps:**
1. Go to bucket settings
2. Enable versioning
3. Upload file "test.txt"
4. Upload same file again with different content
5. View version history

**Expected Result:**
- Multiple versions created
- Version history shows all versions
- Each version has unique versionId

**Status:** ⏳ Pending

### Test Case 8.2: Restore Version
**Steps:**
1. View version history
2. Click "Restore" on older version

**Expected Result:**
- Older version becomes current
- New version created

**Status:** ⏳ Pending

### Test Case 8.3: Delete Version
**Steps:**
1. Delete specific version

**Expected Result:**
- Version removed
- Delete marker created (if deleting current)
- Other versions unchanged

**Status:** ⏳ Pending

---

## 9. Event Notifications Testing

### Test Case 9.1: Register Webhook
**Steps:**
1. Go to bucket settings
2. Open Event Notifications
3. Add webhook URL (use webhook.site for testing)
4. Select ObjectCreated events
5. Save

**Expected Result:**
- Webhook registered successfully

**Status:** ⏳ Pending

### Test Case 9.2: ObjectCreated Event
**Steps:**
1. Upload a file
2. Check webhook.site for received event

**Expected Result:**
- Event received with correct payload
- Event type: ObjectCreated:Put
- Bucket and key information correct

**Status:** ⏳ Pending

### Test Case 9.3: ObjectRemoved Event
**Steps:**
1. Delete a file
2. Check webhook.site

**Expected Result:**
- Event received
- Event type: ObjectRemoved:Delete

**Status:** ⏳ Pending

### Test Case 9.4: Test Webhook
**Steps:**
1. Click "Test Webhook" button

**Expected Result:**
- Test event sent
- Success message shown

**Status:** ⏳ Pending

---

## 10. Delete Bucket Testing

### Test Case 10.1: Delete Non-Empty Bucket
**Steps:**
1. Try to delete bucket with objects

**Expected Result:**
- Error message: "Bucket must be empty"
- Bucket not deleted

**Status:** ⏳ Pending

### Test Case 10.2: Delete Empty Bucket
**Steps:**
1. Remove all objects
2. Delete bucket

**Expected Result:**
- Bucket deleted successfully
- Removed from bucket list

**Status:** ⏳ Pending

---

## Testing Summary

**Total Test Cases:** 30
**Passed:** 0
**Failed:** 0
**Pending:** 30

## Notes
- Use browser DevTools Network tab to inspect requests/responses
- Check backend console for errors
- Verify database state after operations
- Test with different file sizes and types
