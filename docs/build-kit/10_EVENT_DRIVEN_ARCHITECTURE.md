# Event-Driven Architecture (Kafka)

The HRMS platform relies on Apache Kafka as a central nervous system to decouple microservices, enabling asynchronous communication, eventual consistency, and robust audit trails.

## 1. Core Principles
- **Choreography over Orchestration:** Services react to domain events published by other services, rather than a central orchestrator commanding services via synchronous API calls.
- **Payload Format:** All events use standard JSON or Avro schemas. Key contains `tenant_id` string to guarantee ordered processing for dependent events within the same tenant.
- **Idempotency:** Consumers are designed to be idempotent. If an event is re-delivered, the database state remains consistent.
- **Outbox Pattern:** To ensure reliable publishing, services write events to a local database `outbox` table within the same transaction that modifies domain entities. A relay process (e.g., Debezium) publishes the outbox logs to Kafka.

## 2. Defined Domain Events

The nomenclature follows `entity.action.status` (e.g., `leave.request.approved`).

### Employee Domain (`employee-topic`)
- `employee.created`: Fired when a new employee record is created (either manually or via ATS conversion). Payload includes basic profile data.
- `employee.updated`: Fired on profile modifications. Useful for syncing data to active directories or external downstream systems.
- `employee.terminated`: Critical event. Triggers off-boarding processes (Asset recovery, IT access revocation).
- `employee.manager.changed`: Triggers re-assignment of pending approvals and appraisal workflows.

### Recruitment Domain (`recruitment-topic`)
- `recruitment.job.published`: Indicates a new job opening. Triggers notifications to recruitment agencies or external job board integrations.
- `recruitment.candidate.applied`: Triggers initial automated screening or notification to the hiring manager.
- `recruitment.candidate.hired`: Crucial lifecycle transition. Consumed by the `employee-service` to initiate pre-boarding and generate the `employee` entity.

### Leave & Time Domain (`time-topic`)
- `leave.requested`: Triggers workflow engine evaluation.
- `leave.approved`: Consumed by `attendance-service` to mark the roster as 'On Leave', bypassing absence alerts. Consumed by `payroll-service` for LOP calculations.
- `leave.cancelled`: Reverses the effects of an approval.
- `attendance.timesheet.finalized`: Marks the end of a time-tracking period, signifying data is ready for Payroll consumption.

### Payroll & Finance Domain (`finance-topic`)
- `payroll.generated`: Signifies a completed calculation run. Triggers generation of PDF payslips and bank transfer instruction files.
- `payroll.payment.initiated`: Triggers notifications to employees.
- `expense.submitted`: Triggers workflow engine evaluation.
- `expense.approved`: Triggers integration with external ERP/Accounting systems for payout.

### Asset Domain (`asset-topic`)
- `asset.allocated`: Triggers a signature request for the 'Asset Liability Handover' document.
- `asset.recovered`: Released back to inventory following off-boarding.

### Cross-Cutting Concerns
- `approval.task.assigned`: The workflow engine signaling a human needs to make a decision. Triggers notifications.
- `approval.decision.approved` / `.rejected`: Signals the resolution of a workflow instance. The originating domain service consumes this to commit its logic (e.g., actually changing the Leave Status to Approved in the DB).
- `tenant.provisioned`: Signals infrastructure and initial seed data setup for a brand new customer workspace.

## 3. Consumer Blueprints

### The Notification Service (Universal Consumer)
The Notification service subscribes to almost *all* topics. It uses an internal routing rules engine to determine if an event warrants an Email, Push, or SMS.
- *Example:* It sees `leave.requested`. It looks up the manager, pulls an email template (`new_leave_request.ftl`), hydrates it with payload data, and dispatches it via SendGrid.

### The Analytics Service (CDC Consumer)
Subscribes to all domain events to populate a denormalized Data Warehouse (e.g., ClickHouse) or Data Lake for fast metrics querying and reporting. It tracks state changes over time (e.g., headcount growth month-over-month).
