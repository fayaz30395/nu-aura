package com.hrms.application.knowledge.service;

import com.hrms.domain.knowledge.WikiPageWatch;
import com.hrms.infrastructure.kafka.producer.EventPublisher;
import com.hrms.infrastructure.knowledge.repository.WikiPageWatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Notification service for NU-Fluence content events.
 * Publishes notifications via Kafka for watchers, mentions, and comments.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FluenceNotificationService {

    private final EventPublisher eventPublisher;
    private final WikiPageWatchRepository wikiPageWatchRepository;

    /**
     * Notify all watchers of a page about an action (edit, publish, comment, etc.).
     * Excludes the actor from notifications.
     *
     * @param tenantId   tenant context
     * @param pageId     the wiki page that was changed
     * @param actorId    the user who performed the action
     * @param action     description of what happened (e.g., "updated", "published", "commented on")
     * @param pageTitle  title of the wiki page
     */
    public void notifyWatchers(UUID tenantId, UUID pageId, UUID actorId, String action, String pageTitle) {
        try {
            List<WikiPageWatch> watchers = wikiPageWatchRepository.findWatchersByPage(tenantId, pageId);

            for (WikiPageWatch watch : watchers) {
                if (watch.getUserId().equals(actorId)) {
                    continue; // Don't notify the actor
                }

                String subject = "Wiki page " + action;
                String body = "The wiki page \"" + pageTitle + "\" was " + action + ".";
                String actionUrl = "/fluence/wiki/" + pageId;

                eventPublisher.publishNotificationEvent(
                        watch.getUserId(),
                        "IN_APP",
                        subject,
                        body,
                        null,
                        null,
                        tenantId,
                        pageId,
                        "WIKI_PAGE",
                        actionUrl,
                        "NORMAL"
                );
            }

            log.debug("Sent watcher notifications for page {} to {} watchers (excluding actor {})",
                    pageId, watchers.size() - 1, actorId);
        } catch (Exception e) { // Intentional broad catch — notification delivery error boundary
            log.error("Failed to notify watchers for page {}: {}", pageId, e.getMessage(), e);
        }
    }

    /**
     * Notify users who were @mentioned in content.
     *
     * @param tenantId         tenant context
     * @param mentionedUserIds set of user IDs that were mentioned
     * @param actorId          the user who created the mention
     * @param contentType      WIKI_PAGE or BLOG_POST
     * @param contentId        ID of the content containing the mention
     * @param contentTitle     title of the content
     */
    public void notifyMentionedUsers(UUID tenantId, Set<UUID> mentionedUserIds, UUID actorId,
                                     String contentType, UUID contentId, String contentTitle) {
        if (mentionedUserIds == null || mentionedUserIds.isEmpty()) {
            return;
        }

        try {
            for (UUID userId : mentionedUserIds) {
                if (userId.equals(actorId)) {
                    continue; // Don't notify the actor about their own mention
                }

                String routePrefix = "WIKI_PAGE".equals(contentType) ? "/fluence/wiki/" : "/fluence/blogs/";
                String subject = "You were mentioned";
                String body = "You were mentioned in \"" + contentTitle + "\".";
                String actionUrl = routePrefix + contentId;

                eventPublisher.publishNotificationEvent(
                        userId,
                        "IN_APP",
                        subject,
                        body,
                        null,
                        null,
                        tenantId,
                        contentId,
                        contentType,
                        actionUrl,
                        "NORMAL"
                );
            }

            log.debug("Sent mention notifications for {} {} to {} users",
                    contentType, contentId, mentionedUserIds.size());
        } catch (Exception e) { // Intentional broad catch — notification delivery error boundary
            log.error("Failed to notify mentioned users for {} {}: {}", contentType, contentId, e.getMessage(), e);
        }
    }

    /**
     * Notify the content owner when someone comments on their content.
     *
     * @param tenantId       tenant context
     * @param contentOwnerId the owner of the content
     * @param actorId        the user who posted the comment
     * @param contentType    WIKI_PAGE or BLOG_POST
     * @param contentId      ID of the content
     * @param contentTitle   title of the content
     */
    public void notifyCommentOnOwnContent(UUID tenantId, UUID contentOwnerId, UUID actorId,
                                          String contentType, UUID contentId, String contentTitle) {
        if (contentOwnerId == null || contentOwnerId.equals(actorId)) {
            return; // Don't notify if owner is the commenter
        }

        try {
            String routePrefix = "WIKI_PAGE".equals(contentType) ? "/fluence/wiki/" : "/fluence/blogs/";
            String subject = "New comment on your content";
            String body = "Someone commented on your content \"" + contentTitle + "\".";
            String actionUrl = routePrefix + contentId;

            eventPublisher.publishNotificationEvent(
                    contentOwnerId,
                    "IN_APP",
                    subject,
                    body,
                    null,
                    null,
                    tenantId,
                    contentId,
                    contentType,
                    actionUrl,
                    "NORMAL"
            );

            log.debug("Sent comment notification for {} {} to owner {}", contentType, contentId, contentOwnerId);
        } catch (Exception e) { // Intentional broad catch — notification delivery error boundary
            log.error("Failed to notify content owner for {} {}: {}", contentType, contentId, e.getMessage(), e);
        }
    }
}
