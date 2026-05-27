# Firestore Security Specification - PlayCifras

This document outlines the security architecture and invariants for Cloud Firestore in **PlayCifras**.

## 1. Data Invariants

### Song Entity
- **ID Integrity**: The document ID must match `^[a-zA-Z0-9_\-]+$` and be <= 128 characters.
- **Ownership**: Only the authenticated creator of the song (matching `request.auth.uid` with `ownerId`) can write (create, update, delete) the document.
- **Strict Fields**: Songs must contain a valid `id`, `title`, `artist`, `tone`, `rawLrc`, and `ownerId`. 
- **Type Safety**:
  - `title`: string <= 200 characters
  - `artist`: string <= 200 characters
  - `tone`: string <= 10 characters
  - `bpm`: number between 20 and 300 (or null/optional)
  - `rawLrc`: string <= 100,000 characters
  - `ownerId`: string <= 128 characters
- **Immutability**: `createdAt` and `ownerId` cannot be changed after creation.
- **Temporal Check**: `createdAt` and `updatedAt` must sync with `request.time` on writes.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following test payloads must be rejected by the security rules:

1. **Spoofed Ownership**: Creating a song with `ownerId` set to a victim's User ID.
2. **Missing Required Fields**: Creating a song without `rawLrc`.
3. **Invalid Data Type (BPM)**: Creating a song where `bpm` is a text string instead of a number.
4. **Value Poisoning (Huge Titling)**: Creating a song with a `title` that exceeds 200 characters to crash rendering or explode storage.
5. **Timestamp Hijacking**: Backdating or postdating `createdAt` instead of using `request.time`.
6. **Privilege Escalation**: Attempting to alter `ownerId` on an update to transfer ownership to another user.
7. **Modifying Immortal Fields**: Changing `createdAt` on update of an existing song.
8. **Resource ID Poisoning**: Specifying a document ID containing malicious scripts or overly long paths.
9. **No-Credentials Creation**: Attempting to create a song without being authenticated.
10. **Foreign Deletion**: Attempting to delete a song belonging to someone else.
11. **Shadow Field Injection**: Inserting a random ghost key `isAdmin: true` inside a song document.
12. **Blanket Query Abuse**: Attempting a list query on all songs without specifying user ownership boundary.

---

## 3. Firestore Rules Structure

The firestore security rules must implement the custom helper `isValidSong` and ensure all writes are authenticated and validated.
All list queries must be bound to `resource.data.ownerId == request.auth.uid`.
