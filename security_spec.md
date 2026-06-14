# Security Spec

## Data Invariants
1. A user profile document can only be created or modified by the user whose UID matches the document ID.
2. A project document can only be created by an authenticated user and must contain their UID as `ownerId`.
3. Only the `ownerId` can read, update, or delete a project.
4. Time fields like `createdAt` and `updatedAt` must be set correctly using server time.

## The "Dirty Dozen" Payloads

1. Attempting to create a user document with a UID that implies spoofed identity.
2. Attempting to create a project without an authenticated session.
3. Accessing or altering another user's project by injecting a different `projectId`.
4. Overwriting the `ownerId` field during a project update.
5. Emitting extremely large payloads causing "Denial of Wallet".
6. Sending an array where a string is expected or missing size checks.
7. Attempting to bypass `email_verified` restrictions (creating data with unverified email).
8. Updating a project without updating `updatedAt`.
9. Missing required properties on project creation (e.g. `data` payload missing).
10. Creating a user without `createdAt` timestamp.
11. Reading another user's profile.
12. Creating a project with fake string values replacing arrays or maps.

## Test Runner
The `firestore.rules.test.ts` file will cover these scenarios to assert robust security.
