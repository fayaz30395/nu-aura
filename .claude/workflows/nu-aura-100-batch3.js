export const meta = {
  name: 'nu-aura-100-batch3',
  description: 'Batch 3 toward 100/100: refactor the 12 controllers that inject repositories directly so data access lives in the service layer (behavior-preserving). Disjoint by domain; verify with mvn compile.',
  phases: [
    { title: 'Refactor', detail: '3 domain agents move repo access from controllers into services' },
    { title: 'Verify', detail: 'central mvn compile must stay green' },
  ],
}

const BE = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend'
const GUARD = `Spring Boot 3.5 / Java 17. STRICT: behavior-preserving refactor ONLY. For each controller that injects a *Repository directly: move that data access into the matching service (add a service method if one doesn't exist that exposes the same operation), inject the SERVICE into the controller, call it, then remove the repository field + its import from the controller. Preserve EXACTLY: every @RequestMapping/@GetMapping/etc path, @PreAuthorize/@RequiresPermission security annotations, method signatures (the frontend depends on request/response shapes), validation, and business logic. If a controller's repo call is trivial (e.g. existsById / a count), still move it behind a service method. Keep tenant-scoping/RLS behavior identical. Do NOT change response DTO shapes. After editing, re-read each file to confirm imports + braces balance. Do NOT run mvn (a single central compile runs after; parallel mvn clashes on target/).`
const S = { type:'object', additionalProperties:false, required:['status','filesEdited','summary','perController','risks'], properties:{
  status:{type:'string',description:'PASS|PARTIAL|FAIL'},
  filesEdited:{type:'array',items:{type:'string'}},
  summary:{type:'string'},
  perController:{type:'array',items:{type:'string'},description:'one line per controller: repo X moved to service Y.method'},
  risks:{type:'array',items:{type:'string'}} } }

phase('Refactor')
const GROUPS = [
  { key:'knowledge', controllers:'WikiPageController, WikiInlineCommentController, FluenceActivityController, BlogPostController (under src/main/java/com/nulogic/api/knowledge/controller)',
    note:'FluenceActivityController was partly refactored already (its @Transactional moved to FluenceActivityService) — only handle its remaining direct repository field here.' },
  { key:'integration-admin', controllers:'WebhookController (api/webhook), IntegrationConnectorController + DocuSignController (api/integration), KafkaAdminController (api/admin)',
    note:'KafkaAdminController is an admin/ops controller — keep its security annotations and any admin-only guards exactly.' },
  { key:'user-workflow-leave', controllers:'ImplicitRoleRuleController (api/user), ApprovalEscalationController (api/workflow), LeaveBalanceController + LeaveRequestController (api/leave)',
    note:'ApprovalEscalationController already had one method (deleteConfig) moved to ApprovalEscalationService in a prior batch — handle only its REMAINING direct repository fields/uses here, reusing ApprovalEscalationService.' },
]
const refactors = await parallel(GROUPS.map((g) => () =>
  agent(`${GUARD}\n\nDOMAIN: ${g.key}. cd ${BE}. Controllers you OWN (and ONLY these + the service/repository classes they delegate to): ${g.controllers}.\nNote: ${g.note}\nFor each: grep the controller for '*Repository' fields, find/extend the matching service, move the access, wire the service in, drop the repo field+import. Return status, filesEdited, perController lines, risks.`,
    { label:`refactor:${g.key}`, phase:'Refactor', agentType:'backend-dev', schema:S })
)).then((r)=>r.filter(Boolean))

log(`Refactor: ${refactors.flatMap((r)=>r.filesEdited||[]).length} files; statuses ${refactors.map(r=>r.status).join('/')}`)

phase('Verify')
const VS = { type:'object', additionalProperties:false, required:['pass','detail'], properties:{
  pass:{type:'boolean'}, detail:{type:'string'} } }
const verify = await agent(
  `cd ${BE} && mvn -q compile -DskipTests -o 2>&1 | tail -40. Report pass=true iff compilation succeeds (BUILD not failing, no 'ERROR'/'BUILD FAILURE'), detail = the last meaningful lines (errors if any, else 'compile clean'). Read-only; do NOT edit. If it fails, include the first compiler error file:line.`,
  { label:'verify:mvn-compile', phase:'Verify', schema:VS })

return {
  refactors: refactors.map((r)=>({ status:r.status, files:r.filesEdited, perController:r.perController, risks:r.risks })),
  compile: verify,
  green: !!verify?.pass,
}
