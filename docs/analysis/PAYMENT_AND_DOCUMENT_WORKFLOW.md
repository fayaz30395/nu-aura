# Payment Gateway & Document Workflow Enhancement - Implementation Guide

## Overview

This document provides implementation details for two major features added to NU-AURA HRMS:

1. **Payment Gateway Integration** - Multi-provider payment processing for payroll, expenses, and loans
2. **Document Management Workflow** - Approval workflows, versioning, access control, and expiry tracking

---

## Part 1: Payment Gateway Integration

### Architecture

```
Frontend (React)
    ↓
Payment Controllers
    ↓
PaymentService (Orchestration)
    ↓
PaymentGatewayAdapter (Interface)
    ↓
RazorpayAdapter / StripeAdapter (Provider-specific)
    ↓
Third-party Payment Providers
```

### Database Schema

**V17 Migration**: Payment Gateway Schema
- `payment_configs` - Gateway provider configuration (encrypted API keys)
- `payment_transactions` - Individual payment records with status tracking
- `payment_batches` - Batch payment operations (for payroll runs)
- `payment_webhooks` - Webhook event tracking
- `payment_refunds` - Refund records and status

### Key Components

#### Backend Domain Entities
- **PaymentConfig**: Stores encrypted payment provider credentials
- **PaymentTransaction**: Individual payment with status lifecycle
- **PaymentBatch**: Grouped payments for bulk operations
- **PaymentWebhook**: Webhook event records
- **PaymentRefund**: Refund transactions

#### Services
- **PaymentService**: Main orchestration service handling:
  - Payment initiation (single and batch)
  - Status checking
  - Refund processing
  - Webhook event processing

- **PaymentGatewayAdapter**: Abstract interface for provider implementations
  - RazorpayAdapter: Razorpay-specific implementation
  - StripeAdapter: Stripe-specific implementation

#### Controllers
- `PaymentController`: `/api/v1/payments` - Payment operations
- `PaymentConfigController`: `/api/v1/payments/config` - Configuration management
- `PaymentWebhookController`: `/api/v1/payments/webhooks/{provider}` - Webhook handling

### Frontend Components

#### Types (`lib/types/payment.ts`)
- PaymentProvider enum
- PaymentType enum
- PaymentStatus enum
- PaymentTransaction interface
- PaymentConfig interface
- PaymentBatch interface
- PaymentRefund interface

#### Hooks (`lib/hooks/queries/usePayments.ts`)
- `useListPayments()` - List all payments
- `usePaymentDetails()` - Get payment details
- `useCheckPaymentStatus()` - Check payment status
- `useInitiatePayment()` - Initiate single payment
- `useProcessRefund()` - Process refund
- `useSavePaymentConfig()` - Save gateway configuration
- `useTestPaymentConnection()` - Test connection

### Permissions

Added to `Permission.java`:
- `PAYMENT:VIEW` - View payments
- `PAYMENT:INITIATE` - Initiate new payments
- `PAYMENT:REFUND` - Process refunds
- `PAYMENT:CONFIG_MANAGE` - Manage gateway configuration

### Integration Points

#### Razorpay Integration
```java
// Location: RazorpayAdapter.java
// Requires: Razorpay SDK (com.razorpay:razorpay-java)
// Key methods:
// - initiatePayment(transaction)
// - checkStatus(externalPaymentId)
// - processRefund(refund)
// - verifyWebhookSignature(payload, signature)
```

#### Stripe Integration
```java
// Location: StripeAdapter.java
// Requires: Stripe SDK (com.stripe:stripe-java)
// Key methods:
// - initiatePayment(transaction)
// - checkStatus(externalPaymentId)
// - processRefund(refund)
// - verifyWebhookSignature(payload, signature)
```

### Configuration

Add to `application.properties`:
```properties
# Encryption configuration
encryption.key=your-secure-encryption-key-min-32-chars

# Payment webhook URLs (configure in provider dashboards)
# Razorpay: https://yourdomain.com/api/v1/payments/webhooks/razorpay
# Stripe: https://yourdomain.com/api/v1/payments/webhooks/stripe
```

### Workflow

1. **Payment Initiation**
   - User initiates payment → PaymentService validates config
   - Adapter sends request to provider → Transaction saved with PROCESSING status
   - Webhook updates status when payment completes

2. **Batch Payments**
   - Create PaymentBatch → Add PaymentTransactions
   - Service processes all transactions → Tracks success/failure counts
   - Webhooks update individual transaction statuses

3. **Refund Processing**
   - User initiates refund → Service validates payment is COMPLETED
   - Adapter processes refund → Tracks as separate PaymentRefund
   - Original transaction marked as REFUNDED

---

## Part 2: Document Management Workflow Enhancement

### Architecture

```
Frontend (React)
    ↓
Document Controllers
    ↓
DocumentWorkflowService
    ↓
Domain Repositories
    ↓
Database (PostgreSQL)
```

### Database Schema

**V18 Migration**: Document Workflow Enhancement
- `document_approval_workflows` - Approval workflow instances
- `document_approval_tasks` - Individual approval tasks
- `document_versions` - Document version history
- `document_categories` - Document categorization
- `document_tags` - Document tagging
- `document_access` - Fine-grained access control
- `document_expiry_tracking` - Expiry reminders

### Key Components

#### Backend Domain Entities
- **DocumentApprovalWorkflow**: Multi-level approval process
- **DocumentApprovalTask**: Individual approval task for an approver
- **DocumentAccess**: User/Role/Department-level access control
- **DocumentExpiryTracking**: Expiry dates and reminder tracking

#### Services
- **DocumentWorkflowService**: Handles:
  - Approval workflow initiation and progression
  - Task creation and status updates
  - Access grant/revoke
  - Expiry tracking and notifications

#### Repositories
- DocumentApprovalWorkflowRepository
- DocumentApprovalTaskRepository
- DocumentAccessRepository
- DocumentExpiryTrackingRepository

### Frontend Components

#### Types (`lib/types/document-workflow.ts`)
- ApprovalWorkflowStatus enum
- ApprovalTaskStatus enum
- DocumentStatus enum
- DocumentAccessLevel enum
- DocumentApprovalWorkflow interface
- DocumentApprovalTask interface
- DocumentAccess interface
- DocumentExpiryTracking interface

#### Hooks (`lib/hooks/queries/useDocumentWorkflow.ts`)
- `useListApprovalWorkflows()` - List all workflows
- `useListPendingApprovals()` - List user's pending approvals
- `useInitiateApprovalWorkflow()` - Start new workflow
- `useApproveDocument()` - Approve at current level
- `useRejectDocument()` - Reject document
- `useGrantDocumentAccess()` - Grant access to user/role/dept
- `useRevokeDocumentAccess()` - Revoke access
- `useSetDocumentExpiry()` - Set expiry date
- `useExpiringDocuments()` - Get soon-to-expire documents

### Permissions

Added to `Permission.java`:
- `DOCUMENT:APPROVE` - Approve documents
- `DOCUMENT:MANAGE_CATEGORY` - Manage categories
- `DOCUMENT:VIEW_ALL` - View all documents
- `DOCUMENT:VERSION_MANAGE` - Manage versions
- `DOCUMENT:ACCESS_MANAGE` - Manage access

### Workflow States

**DocumentApprovalWorkflow**:
- PENDING → IN_PROGRESS → APPROVED/REJECTED → completed

**DocumentApprovalTask**:
- PENDING → APPROVED/REJECTED/DELEGATED

**DocumentStatus**:
- DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → ARCHIVED/EXPIRED

### Access Control Hierarchy

```
MANAGE (4) > APPROVE (3) > EDIT (2) > VIEW (1)
```

Access can be granted to:
- Specific users
- Roles
- Departments
- Combination of above

Supports optional expiry dates for temporary access.

### Expiry Tracking

Features:
- Set expiry dates on documents
- Configurable reminder days (default: 30 days before)
- Automatic reminder notifications
- Query expired and expiring documents

### Multi-Level Approvals

Example workflow with 3 approval levels:
1. **Level 1**: Department Manager
2. **Level 2**: HR Head
3. **Level 3**: Director

Each level must explicitly approve before moving to next.

---

## Database Migrations

### V17: Payment Gateway Schema
Location: `/backend/src/main/resources/db/migration/V17__payment_gateway_schema.sql`

Tables created:
- payment_configs (with encrypted API key column)
- payment_transactions
- payment_batches
- payment_batch_transactions (junction table)
- payment_webhooks
- payment_refunds

### V18: Document Workflow Enhancement
Location: `/backend/src/main/resources/db/migration/V18__document_workflow_enhancement.sql`

Tables created/altered:
- document_approval_workflows (new)
- document_approval_tasks (new)
- document_versions (enhanced)
- document_categories (enhanced)
- document_tags (new)
- document_access (new)
- document_expiry_tracking (new)

---

## Implementation Checklist

### Backend
- [x] Create V17 payment schema migration
- [x] Create V18 document workflow schema migration
- [x] Create payment domain entities
- [x] Create document workflow domain entities
- [x] Create repositories (payment + document)
- [x] Create PaymentService with provider adapters
- [x] Create DocumentWorkflowService
- [x] Create PaymentControllers (3 controllers)
- [x] Create DocumentWorkflow DTOs and services
- [x] Add encryption service for API keys
- [x] Update Permission.java with new permissions
- [ ] Create unit tests for all services
- [ ] Create payment provider integration tests
- [ ] Document webhook signature verification
- [ ] Add audit logging for sensitive operations

### Frontend
- [x] Create payment types
- [x] Create document workflow types
- [x] Create payment React Query hooks
- [x] Create document workflow React Query hooks
- [ ] Create payment configuration page
- [ ] Create payment history page with filters
- [ ] Create document approval dashboard
- [ ] Create document access management UI
- [ ] Create expiry tracking dashboard
- [ ] Add notification components

### DevOps/Configuration
- [ ] Add encryption key to environment variables
- [ ] Configure webhook endpoints in payment providers
- [ ] Set up payment webhook secret management
- [ ] Add monitoring/alerting for failed payments
- [ ] Create payment reconciliation batch job
- [ ] Create document expiry notification job

---

## API Endpoints

### Payment APIs

```
POST   /api/v1/payments                    - Initiate payment
GET    /api/v1/payments                    - List payments (paginated)
GET    /api/v1/payments/{paymentId}        - Get payment details
GET    /api/v1/payments/{paymentId}/status - Check payment status
POST   /api/v1/payments/{paymentId}/refund - Process refund

POST   /api/v1/payments/config             - Save gateway config
POST   /api/v1/payments/config/test-connection - Test connection

POST   /api/v1/payments/webhooks/{provider} - Webhook handler (no auth)
POST   /api/v1/payments/webhooks/razorpay   - Razorpay webhook
POST   /api/v1/payments/webhooks/stripe     - Stripe webhook
```

### Document Workflow APIs

```
GET    /api/v1/documents/workflow                           - List workflows
GET    /api/v1/documents/workflow/pending                   - List pending approvals
GET    /api/v1/documents/workflow/{workflowId}              - Get workflow details
POST   /api/v1/documents/workflow/initiate                  - Start workflow
POST   /api/v1/documents/workflow/{workflowId}/approve      - Approve
POST   /api/v1/documents/workflow/{workflowId}/reject       - Reject

GET    /api/v1/documents/{documentId}/access                - List access records
POST   /api/v1/documents/{documentId}/access                - Grant access
DELETE /api/v1/documents/{documentId}/access/{accessId}     - Revoke access

GET    /api/v1/documents/{documentId}/expiry                - Get expiry info
POST   /api/v1/documents/{documentId}/expiry                - Set expiry
GET    /api/v1/documents/expiring                           - List expiring docs
```

---

## Security Considerations

### Payment Gateway
1. **API Keys**: Always encrypted at rest, decrypted only when needed
2. **Webhook Verification**: All webhooks must pass signature verification
3. **Audit Logging**: All payment operations logged with user/timestamp
4. **Transaction Reference**: Unique per payment for idempotency
5. **Sensitive Data**: Never log full API keys or account numbers

### Document Workflow
1. **Access Control**: Multi-level hierarchy enforced on all operations
2. **Audit Trail**: All approvals/rejections logged
3. **Expiry Notifications**: Sent to document owner and approvers
4. **SuperAdmin Bypass**: SuperAdmin role bypasses approval workflows

---

## Testing Strategy

### Unit Tests
- PaymentService CRUD and workflow operations
- PaymentGatewayAdapter interface contracts
- DocumentWorkflowService approval state transitions
- Expiry tracking calculations

### Integration Tests
- End-to-end payment flow
- Webhook processing
- Multi-level approval workflows
- Access control enforcement

### Manual Testing
- Test payment provider connections (Razorpay, Stripe)
- Webhook signature verification
- Approval workflow with multiple users
- Expiry notifications

---

## Future Enhancements

1. **Payment Reconciliation**: Automated daily reconciliation with provider
2. **Payment Analytics**: Dashboard with payment trends, success rates
3. **Document Signing**: eSignature integration for approvals
4. **Batch Upload**: Bulk document upload with automatic categorization
5. **Document Retention**: Auto-archive/delete based on retention policies
6. **Approval Delegates**: Allow approvers to delegate temporarily
7. **Conditional Approvals**: Route approvals based on payment amount/type
8. **Document Templates**: Pre-configured approval workflows per category

---

## File Locations Summary

### Backend Files

**Migrations**:
- `/backend/src/main/resources/db/migration/V17__payment_gateway_schema.sql`
- `/backend/src/main/resources/db/migration/V18__document_workflow_enhancement.sql`

**Payment Domain**:
- `/backend/src/main/java/com/hrms/domain/payment/PaymentConfig.java`
- `/backend/src/main/java/com/hrms/domain/payment/PaymentTransaction.java`
- `/backend/src/main/java/com/hrms/domain/payment/PaymentBatch.java`
- `/backend/src/main/java/com/hrms/domain/payment/PaymentWebhook.java`
- `/backend/src/main/java/com/hrms/domain/payment/PaymentRefund.java`
- `/backend/src/main/java/com/hrms/domain/payment/*Repository.java` (5 repositories)

**Payment Services**:
- `/backend/src/main/java/com/hrms/application/payment/service/PaymentService.java`
- `/backend/src/main/java/com/hrms/application/payment/service/PaymentGatewayAdapter.java`
- `/backend/src/main/java/com/hrms/application/payment/service/RazorpayAdapter.java`
- `/backend/src/main/java/com/hrms/application/payment/service/StripeAdapter.java`

**Payment Controllers & DTOs**:
- `/backend/src/main/java/com/hrms/api/payment/controller/PaymentController.java`
- `/backend/src/main/java/com/hrms/api/payment/controller/PaymentConfigController.java`
- `/backend/src/main/java/com/hrms/api/payment/controller/PaymentWebhookController.java`
- `/backend/src/main/java/com/hrms/api/payment/dto/PaymentTransactionDto.java`
- `/backend/src/main/java/com/hrms/api/payment/dto/PaymentConfigDto.java`

**Document Workflow Domain**:
- `/backend/src/main/java/com/hrms/domain/document/DocumentApprovalWorkflow.java`
- `/backend/src/main/java/com/hrms/domain/document/DocumentApprovalTask.java`
- `/backend/src/main/java/com/hrms/domain/document/DocumentAccess.java`
- `/backend/src/main/java/com/hrms/domain/document/DocumentExpiryTracking.java`
- `/backend/src/main/java/com/hrms/domain/document/*Repository.java` (4 repositories)

**Document Workflow Service**:
- `/backend/src/main/java/com/hrms/application/document/service/DocumentWorkflowService.java`

**Security**:
- `/backend/src/main/java/com/hrms/common/security/EncryptionService.java`
- `/backend/src/main/java/com/hrms/common/security/Permission.java` (updated)

### Frontend Files

**Types**:
- `/frontend/lib/types/payment.ts`
- `/frontend/lib/types/document-workflow.ts`

**Hooks**:
- `/frontend/lib/hooks/queries/usePayments.ts`
- `/frontend/lib/hooks/queries/useDocumentWorkflow.ts`

---

## Next Steps

1. Run database migrations: `flyway migrate`
2. Verify TypeScript compilation: `npx tsc --noEmit`
3. Create payment configuration page UI
4. Create document approval dashboard UI
5. Add comprehensive unit tests
6. Test with actual payment providers
7. Deploy to staging environment

---

End of Implementation Guide
