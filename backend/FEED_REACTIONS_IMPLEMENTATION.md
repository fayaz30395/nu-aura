# Feed Reactions & Comments Implementation Guide

## Current State

The company feed aggregates content from multiple sources, but only **Wall Posts** have full reactions/comments support via the Wall API.

### Database Schema

**Existing Tables:**
- `wall_posts` + `post_reactions` + `post_comments` ✅ (fully implemented)
- `recognitions` + `recognition_reactions` ⚠️ (entity exists, no REST API)
- `announcements` ❌ (no reaction support)

## Required Implementation

### Option 1: Create Wall Posts for All Feed Items (Recommended)

Automatically create a `wall_post` when a feed-worthy event occurs:

```java
// In RecognitionService.giveRecognition()
@Autowired
private WallService wallService;

public RecognitionResponse giveRecognition(UUID giverId, RecognitionRequest request) {
    // ... existing code ...
    Recognition saved = recognitionRepository.save(entity);

    // Create wall post for this recognition
    CreatePostRequest wallPostRequest = new CreatePostRequest();
    wallPostRequest.setType(WallPost.PostType.PRAISE);
    wallPostRequest.setContent(request.getMessage());
    wallPostRequest.setPraiseRecipientId(request.getReceiverId());
    wallPostRequest.setVisibility(PostVisibility.ORGANIZATION);

    WallPostResponse wallPost = wallService.createPost(wallPostRequest, giverId);

    // Store wallPostId in recognition for reference
    saved.setWallPostId(wallPost.getId());
    recognitionRepository.save(saved);

    // ... rest of existing code ...
}
```

**Required Changes:**
1. Add `wall_post_id UUID` column to `recognitions` table
2. Add `wallPostId` field to `Recognition` entity
3. Create wall posts in `giveRecognition()`
4. Return `wallPostId` in `RecognitionResponse`
5. Map `wallPostId` and `hasReacted` in `FeedService.fetchRecognitions()`

### Option 2: Add Recognition Reaction Endpoints

Create dedicated endpoints for recognition reactions (mirrors wall post API):

```java
// In RecognitionController
@PostMapping("/{recognitionId}/reactions")
@RequiresPermission(RECOGNITION_REACT)
public ResponseEntity<Void> addReaction(
    @PathVariable UUID recognitionId,
    @Valid @RequestBody ReactionRequest request
) {
    UUID employeeId = SecurityContext.getCurrentEmployeeId();
    recognitionService.addReaction(recognitionId, employeeId, request.getReactionType());
    return ResponseEntity.ok().build();
}

@DeleteMapping("/{recognitionId}/reactions")
@RequiresPermission(RECOGNITION_REACT)
public ResponseEntity<Void> removeReaction(@PathVariable UUID recognitionId) {
    UUID employeeId = SecurityContext.getCurrentEmployeeId();
    recognitionService.removeReaction(recognitionId, employeeId);
    return ResponseEntity.noContent().build();
}

@PostMapping("/{recognitionId}/comments")
@RequiresPermission(RECOGNITION_COMMENT)
public ResponseEntity<CommentResponse> addComment(
    @PathVariable UUID recognitionId,
    @Valid @RequestBody CreateCommentRequest request
) {
    UUID employeeId = SecurityContext.getCurrentEmployeeId();
    CommentResponse response = recognitionService.addComment(recognitionId, request, employeeId);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
}
```

**Required Changes:**
1. Add service methods in `RecognitionService` for reactions/comments
2. Add `hasReacted(UUID recognitionId, UUID employeeId)` method
3. Return `hasReacted` in `RecognitionResponse`
4. Update frontend to call correct API based on item type

## Frontend Changes

### Feed Service Enhancement

```typescript
// In feedService.fetchRecognitions()
return data.content.map((r: Recognition): FeedItem => ({
  id: `recognition-${r.id}`,
  type: 'RECOGNITION',
  wallPostId: r.wallPostId, // ← Add this
  hasReacted: r.hasReacted, // ← Add this
  // ... existing fields ...
}));
```

### Recognition Service (if using Option 2)

```typescript
class RecognitionService {
  async addReaction(recognitionId: string, reactionType: ReactionType) {
    await api.post(`/recognition/${recognitionId}/reactions`, { reactionType });
  }

  async removeReaction(recognitionId: string) {
    await api.delete(`/recognition/${recognitionId}/reactions`);
  }

  async addComment(recognitionId: string, content: string) {
    return await api.post(`/recognition/${recognitionId}/comments`, { content });
  }
}
```

### Feed Component Enhancement

```typescript
const handleLike = async () => {
  if (!item.wallPostId) {
    // For recognitions without wall posts, use recognition API
    if (item.type === 'RECOGNITION') {
      if (wasLiked) {
        await recognitionService.removeReaction(item.id.replace('recognition-', ''));
      } else {
        await recognitionService.addReaction(item.id.replace('recognition-', ''), 'LIKE');
      }
      return;
    }
    console.warn('This item type does not support reactions');
    return;
  }

  // Use wall service for items with wallPostId
  if (wasLiked) {
    await wallService.removeReaction(item.wallPostId);
  } else {
    await wallService.addReaction(item.wallPostId, 'LIKE');
  }
};
```

## Migration Script

If choosing Option 1, create wall posts for existing recognitions:

```sql
-- Add wallPostId column to recognitions table
ALTER TABLE recognitions ADD COLUMN wall_post_id UUID;

-- Create index
CREATE INDEX idx_recognitions_wall_post ON recognitions(wall_post_id);
```

## Testing Checklist

- [ ] Like a recognition → persists after refresh
- [ ] Comment on recognition → appears in feed
- [ ] Reaction count updates in real-time
- [ ] Tenant isolation works (can't react to other tenant's items)
- [ ] Permission checks enforced (WALL_REACT, WALL_COMMENT)
- [ ] Soft delete preserves integrity
- [ ] Multiple reactions from same user handled correctly
- [ ] Optimistic UI updates with error rollback

## Recommended Approach

**Use Option 1 (Wall Posts for Everything)**

**Why?**
1. Single source of truth for reactions/comments
2. Consistent API across all feed items
3. Leverages existing, tested Wall API
4. Easier frontend implementation
5. Better analytics (all engagement in one place)

**Steps:**
1. Add migration to add `wall_post_id` to `recognitions`
2. Update `RecognitionService.giveRecognition()` to create wall post
3. Add `wallPostId` to `RecognitionResponse`
4. Update `FeedService.fetchRecognitions()` to include `wallPostId` and `hasReacted`
5. Test thoroughly with existing recognitions

**Estimated Effort:** 2-3 hours
