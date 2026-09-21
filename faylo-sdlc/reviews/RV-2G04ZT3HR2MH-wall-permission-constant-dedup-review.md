# RV-2G04ZT3HR2MH: Wall permission constant + dedup review

> **Story:** US-2FZSZ02YPQA9
> **Author:** backend-lead
> **Reviewer:** async-qa-reviewer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

Replaced 3x hardcoded "WALL:MANAGE" literal with Permission.WALL_MANAGE; extracted the duplicated owner-or-admin check (updatePost/deletePost/deleteComment) into requireOwnerOrManager(). Also fixed two pre-existing test/prod-constructor drifts discovered while running the suite: WallServiceTest and BlogPostServiceTest still used the old constructor arity from earlier stories in this batch (WebSocketNotificationService / FluenceNotificationService+repos), and FileUploadControllerTest/InterviewManagementServiceTest were missing mocks for the same additions - fixed all four so mvn test is green again repo-wide for these suites. Compiles clean.
