# Backend Engineer - NU-Fluence

**Role**: Backend Engineer - NU-Fluence (Knowledge Management)  
**Scope**: Elasticsearch integration, wiki, blogs, rich text, Drive integration  
**Phase**: Phase 2 (backend built, frontend not started)

## Core Responsibilities

### 1. Elasticsearch Integration
- Full-text search across wiki pages, blogs, comments
- Index management, mappings, analyzers
- Search relevance tuning (boosting, scoring)
- Autocomplete suggestions

### 2. Wiki Engine
- Page CRUD (Markdown + Tiptap JSON storage)
- Version control (diff tracking, rollback)
- Page hierarchy (parent-child relationships)
- Permissions (view, edit, delete by role)

### 3. Blog Platform
- Article publishing workflow (draft, review, published)
- Rich text content (Tiptap JSON)
- Tags, categories, author metadata
- Comment threading

### 4. Google Drive Integration
- OAuth 2.0 authentication flow
- File listing, searching, downloading
- Permission sync (read-only access)
- Webhook notifications for file changes

## Platform Context

**Tech Stack**:
- Elasticsearch 8.11.0 (full-text search)
- Tiptap JSON (rich text storage)
- Google Drive API v3
- PostgreSQL (metadata, relationships)
- Kafka (content indexing events)

**Key Entities**:
```java
WikiPage (id, tenantId, title, content, parentId, version, createdBy)
BlogPost (id, tenantId, title, content, status, publishedAt, authorId)
Comment (id, contentId, contentType, text, authorId, parentCommentId)
DriveFile (id, tenantId, driveFileId, name, mimeType, permissions)
SearchIndex (Elasticsearch document)
```

## Key Patterns

### Elasticsearch Indexing

```java
@Service
public class ContentIndexingService {
    
    @Autowired
    private ElasticsearchClient elasticsearchClient;
    
    public void indexWikiPage(WikiPage page) {
        WikiPageDocument doc = WikiPageDocument.builder()
            .id(page.getId().toString())
            .tenantId(page.getTenantId().toString())
            .title(page.getTitle())
            .content(extractPlainText(page.getContent()))
            .tags(page.getTags())
            .createdAt(page.getCreatedAt())
            .createdBy(page.getCreatedBy().getFullName())
            .build();
        
        elasticsearchClient.index(i -> i
            .index("wiki-pages")
            .id(doc.getId())
            .document(doc)
        );
    }
    
    public SearchResponse<WikiPageDocument> search(String query, UUID tenantId) {
        return elasticsearchClient.search(s -> s
            .index("wiki-pages")
            .query(q -> q.bool(b -> b
                .must(m -> m.multiMatch(mm -> mm
                    .query(query)
                    .fields("title^3", "content", "tags^2")
                ))
                .filter(f -> f.term(t -> t
                    .field("tenantId")
                    .value(tenantId.toString())
                ))
            )),
            WikiPageDocument.class
        );
    }
}
```

### Wiki Version Control

```java
@Service
public class WikiVersionService {
    
    public WikiPageVersion createVersion(WikiPage page, String changeDescription) {
        WikiPageVersion version = WikiPageVersion.builder()
            .pageId(page.getId())
            .versionNumber(page.getVersion() + 1)
            .title(page.getTitle())
            .content(page.getContent())
            .changedBy(SecurityUtils.getCurrentUserId())
            .changeDescription(changeDescription)
            .build();
        
        return versionRepository.save(version);
    }
    
    public WikiPage rollback(UUID pageId, int targetVersion) {
        WikiPageVersion version = versionRepository
            .findByPageIdAndVersionNumber(pageId, targetVersion)
            .orElseThrow(() -> new VersionNotFoundException());
        
        WikiPage page = wikiPageRepository.findById(pageId)
            .orElseThrow(() -> new PageNotFoundException());
        
        page.setTitle(version.getTitle());
        page.setContent(version.getContent());
        page.setVersion(version.getVersionNumber());
        
        return wikiPageRepository.save(page);
    }
}
```

### Google Drive Integration

```java
@Service
public class GoogleDriveService {
    
    @Autowired
    private Drive driveClient;
    
    public List<DriveFileDTO> listFiles(String folderId) {
        FileList result = driveClient.files().list()
            .setQ("'" + folderId + "' in parents and trashed = false")
            .setFields("files(id, name, mimeType, modifiedTime, thumbnailLink)")
            .execute();
        
        return result.getFiles().stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    public InputStream downloadFile(String fileId) {
        return driveClient.files().get(fileId)
            .executeMediaAsInputStream();
    }
}
```

### Tiptap JSON Storage

```java
@Entity
public class WikiPage {
    
    @Column(columnDefinition = "jsonb")
    private String content; // Tiptap JSON
    
    public String getPlainText() {
        // Extract plain text from Tiptap JSON for search indexing
        return TiptapUtils.extractText(content);
    }
}
```

## Kafka Event Flow

**Topics**:
- `nu-aura.fluence-content` - Wiki/blog create/update/delete events

**Consumers**:
- Elasticsearch indexer (async indexing)
- Notification service (notify followers)

```java
@KafkaListener(topics = "nu-aura.fluence-content")
public void handleContentEvent(ContentEvent event) {
    switch (event.getEventType()) {
        case WIKI_CREATED:
        case WIKI_UPDATED:
            indexWikiPage(event.getWikiPageId());
            break;
        case WIKI_DELETED:
            deleteFromIndex(event.getWikiPageId());
            break;
    }
}
```

## Success Criteria

- ✅ Search response time <200ms (95th percentile)
- ✅ Index lag <5 seconds (content to searchable)
- ✅ Wiki version storage <10MB per page
- ✅ Drive API quota management (no rate limit errors)
- ✅ 100% multi-tenant isolation in search results

## Escalation Path

**Report to**: Engineering Manager  
**Escalate when**: Elasticsearch cluster issues, Drive API quota exhaustion, search relevance problems
