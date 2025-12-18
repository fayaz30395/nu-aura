# Analytics & Dashboards Roadmap

Comprehensive plan for building a world-class analytics and dashboards suite for the NuLogic HRMS platform.

**Last Updated**: December 17, 2025
**Version**: 1.1 (Phase 1 Complete)

---

## Table of Contents

- [Implementation Status](#implementation-status)
- [Current State](#current-state)
- [Vision & Objectives](#vision--objectives)
- [Analytics Capabilities to Build](#analytics-capabilities-to-build)
- [Dashboard Requirements](#dashboard-requirements)
- [Predictive Analytics Features](#predictive-analytics-features)
- [KPIs & Metrics](#kpis--metrics)
- [Technical Implementation](#technical-implementation)
- [Implementation Roadmap](#implementation-roadmap)
- [Success Metrics](#success-metrics)

---

## Implementation Status

### Phase 1 - COMPLETED (December 17, 2025)

**Role-Based Dashboards Implemented:**

| Dashboard | Status | Controller | Service |
|-----------|--------|------------|---------|
| **Executive Dashboard** | ✅ Complete | DashboardsController | ExecutiveDashboardService |
| **Manager Dashboard** | ✅ Complete | DashboardsController | ManagerDashboardService |
| **Employee Dashboard** | ✅ Complete | DashboardsController | EmployeeDashboardService |
| **HR Operations Dashboard** | ✅ Complete | DashboardsController | DashboardAnalyticsService |
| **Dashboard Widgets** | ✅ Complete | DashboardsController | Various |
| **Smart Routing (/my)** | ✅ Complete | DashboardsController | Auto-detection |

**New API Endpoints:**

```
GET  /api/v1/dashboards/executive          - C-suite KPIs and metrics
GET  /api/v1/dashboards/manager            - Team insights for current manager
GET  /api/v1/dashboards/manager/{id}       - Team insights for specific manager
GET  /api/v1/dashboards/employee           - Personal analytics for current employee
GET  /api/v1/dashboards/employee/{id}      - Personal analytics for specific employee
GET  /api/v1/dashboards/hr-operations      - Day-to-day HR metrics
GET  /api/v1/dashboards/my                 - Smart routing based on role
GET  /api/v1/dashboards/widgets/attendance - Attendance widget
GET  /api/v1/dashboards/widgets/leave      - Leave widget
GET  /api/v1/dashboards/widgets/headcount  - Headcount widget
GET  /api/v1/dashboards/widgets/payroll    - Payroll widget
GET  /api/v1/dashboards/widgets/events     - Events widget
```

**New Permissions Added:**
- `DASHBOARD:EXECUTIVE` - Access executive-level dashboards
- `DASHBOARD:HR_OPS` - Access HR operations dashboard
- `DASHBOARD:MANAGER` - Access manager team dashboard
- `DASHBOARD:EMPLOYEE` - Access employee self-service dashboard
- `DASHBOARD:WIDGETS` - Access dashboard widgets

**Files Created:**
- `api/analytics/dto/ExecutiveDashboardResponse.java` - Executive DTO with KPIs, financial summary, risk indicators
- `api/analytics/dto/ManagerDashboardResponse.java` - Manager DTO with team metrics, action items
- `api/analytics/dto/EmployeeDashboardResponse.java` - Employee DTO with personal analytics
- `api/analytics/controller/DashboardsController.java` - Unified dashboards controller
- `application/analytics/service/ExecutiveDashboardService.java` - Executive dashboard service
- `application/analytics/service/ManagerDashboardService.java` - Manager dashboard service
- `application/analytics/service/EmployeeDashboardService.java` - Employee dashboard service

**Repository Enhancements:**
- `LeaveRequestRepository` - Added date range queries, employee-specific queries
- `AttendanceRecordRepository` - Added date range, employee queries
- `HolidayRepository` - Added count holidays in date range
- `LeaveBalanceRepository` - Added sum balances, detailed balances
- `PayslipRepository` - Added employee-specific queries

---

## Current State

### Existing Analytics Infrastructure

#### 1. Controllers & API Layer

| Controller | Status | Endpoints |
|-----------|--------|-----------|
| **AnalyticsController** | ✅ Complete | `/api/v1/analytics/*` |
| **AdvancedAnalyticsController** | ✅ Complete | `/api/v1/advanced-analytics/*` |
| **PredictiveAnalyticsController** | ✅ Complete | `/api/v1/predictive-analytics/*` |
| **DashboardController** | ✅ Complete | `/api/v1/dashboard/*` |
| **DashboardsController** | ✅ NEW | `/api/v1/dashboards/*` (role-based) |

#### 2. Services Implementation Status

| Service | Implementation | Status |
|---------|---------------|--------|
| **ExecutiveDashboardService** | 100% | ✅ Complete - C-suite metrics, KPIs, risk indicators |
| **ManagerDashboardService** | 100% | ✅ Complete - Team overview, attendance, leave, performance |
| **EmployeeDashboardService** | 100% | ✅ Complete - Personal analytics, career progress |
| **DashboardAnalyticsService** | 80% | ⚠️ Enhanced - Day-to-day HR metrics |
| **PredictiveAnalyticsService** | 40% | ⚠️ Partial - Uses simulated predictions |
| **AdvancedAnalyticsService** | 60% | ⚠️ Partial - Trend analysis in progress |

#### 3. Current Capabilities

**What Works (Phase 1 Complete)**:
- ✅ Role-based dashboard API structure
- ✅ Executive dashboard with KPIs, financial metrics, risk indicators
- ✅ Manager dashboard with team insights, action items
- ✅ Employee dashboard with personal analytics
- ✅ Smart dashboard routing by user role
- ✅ Dashboard widgets API
- ✅ Repository queries for analytics
- ✅ RBAC integration with 5 new permissions

**What's Still Missing (Phase 2-3)**:
- Frontend UI for all dashboards
- Real ML model implementation (uses simulated predictions)
- Real-time data pipelines (SSE/WebSocket)
- Caching layer for performance
- Custom report builder

---

## Vision & Objectives

### Vision Statement

Build an intelligent analytics platform that provides **actionable insights** to help HR teams make **data-driven decisions** about workforce planning, employee engagement, retention, and organizational health.

### Core Objectives

1. **Real-time Insights**: Provide up-to-date metrics without manual intervention
2. **Predictive Capabilities**: Forecast attrition, identify skill gaps, predict performance
3. **Actionable Recommendations**: Not just data, but what to do with it
4. **Executive-Ready**: Visualizations suitable for C-suite presentations
5. **Self-Service**: Empower HR teams to explore data independently
6. **Mobile-Friendly**: Access key metrics on mobile devices

---

## Analytics Capabilities to Build

### 1. Workforce Analytics

#### A. Headcount Analytics

**Metrics**:
- Total headcount (current, historical trends)
- Headcount by department, location, level
- Headcount by employment type (FTE, contractor, intern)
- Headcount growth rate (MoM, QoQ, YoY)
- Span of control analysis
- Organizational density

**Visualizations**:
- Headcount trend line chart
- Department distribution (pie/donut chart)
- Location heatmap
- Hierarchical org chart with counts

**Implementation Priority**: P0 (High)
**Estimated Effort**: 2 weeks

---

#### B. Demographics Analytics

**Metrics**:
- Age distribution
- Gender diversity ratio
- Tenure distribution
- Education levels
- Diversity metrics (race, nationality, etc.)

**Visualizations**:
- Age pyramid
- Diversity scorecards
- Tenure histogram
- Geographic distribution map

**Implementation Priority**: P1 (Medium)
**Estimated Effort**: 1-2 weeks

---

#### C. Compensation Analytics

**Metrics**:
- Average salary by department/level
- Compensation bands compliance
- Gender pay gap analysis
- Cost per employee
- Total compensation trends
- Variable pay distribution

**Visualizations**:
- Compensation box plots
- Pay equity heatmaps
- Salary trend lines
- Budget vs actual spending

**Implementation Priority**: P0 (High)
**Estimated Effort**: 2-3 weeks

---

### 2. Attendance & Time Analytics

#### Metrics to Track

| Metric | Description | Calculation |
|--------|-------------|-------------|
| **Attendance Rate** | % of days employees present | (Days Present / Working Days) × 100 |
| **Absenteeism Rate** | % of days absent | (Days Absent / Working Days) × 100 |
| **Late Arrival Rate** | % of late check-ins | (Late Check-ins / Total Check-ins) × 100 |
| **Average Work Hours** | Mean hours worked per day | Sum(Work Hours) / Total Days |
| **Overtime Hours** | Total OT hours | Sum of approved overtime |
| **Weekend Work** | Work on weekends | Count of weekend check-ins |

**Dimensions**:
- By employee, department, location
- By day of week, month, quarter
- By shift type

**Visualizations**:
- Attendance trend calendar heatmap
- Department-wise attendance comparison
- Weekly/monthly attendance patterns
- Top absentee list

**Implementation Priority**: P0 (High)
**Estimated Effort**: 2 weeks

---

### 3. Leave Analytics

#### Metrics to Track

| Metric | Description |
|--------|-------------|
| **Leave Utilization Rate** | % of allocated leaves taken |
| **Leave Balance Trending** | Projected year-end balances |
| **Leave Approval Time** | Average time to approve leaves |
| **Sick Leave Patterns** | Frequency and timing of sick leaves |
| **Unplanned Leave Rate** | % of leaves taken on short notice |
| **Peak Leave Periods** | Months with highest leave volume |

**Analytics Insights**:
- Team availability forecasting
- Leave pattern anomalies (potential abuse)
- Burnout indicators (unused leaves)
- Resource planning for peak periods

**Visualizations**:
- Leave calendar with team view
- Leave type breakdown (stacked bar)
- Monthly leave trends
- Department leave comparison

**Implementation Priority**: P0 (High)
**Estimated Effort**: 2 weeks

---

### 4. Performance Analytics

#### Metrics to Track

| Category | Metrics |
|----------|---------|
| **Performance Distribution** | % in each rating band (1-5) |
| **Goal Completion** | % of goals achieved on time |
| **Review Completion** | % of reviews completed |
| **Calibration Analysis** | Rating distribution by manager |
| **Performance Trends** | Rating changes over time |
| **High Performers** | Top 10% identification |

**Advanced Analytics**:
- Manager bias detection (leniency/severity)
- Performance-compensation correlation
- Performance-tenure correlation
- High performer retention rate

**Visualizations**:
- Performance bell curve
- 9-box grid (performance vs potential)
- Rating distribution by department
- Performance trend lines

**Implementation Priority**: P1 (High)
**Estimated Effort**: 3 weeks

---

### 5. Recruitment Analytics

#### Metrics to Track

| Metric | Description | Target |
|--------|-------------|--------|
| **Time to Hire** | Days from posting to offer acceptance | < 30 days |
| **Cost per Hire** | Total recruitment cost / hires | Industry benchmark |
| **Source Effectiveness** | Hires by source channel | Vary by role |
| **Offer Acceptance Rate** | Offers accepted / offers made | > 85% |
| **Quality of Hire** | 1-year performance rating | > 3.5/5 |
| **Interview-to-Offer Ratio** | Interviews / offers made | Optimize |

**Funnel Analytics**:
- Application → Screening → Interview → Offer → Hire
- Drop-off rates at each stage
- Stage-wise time distribution

**Visualizations**:
- Recruitment funnel
- Source effectiveness comparison
- Time-to-hire trends
- Hiring manager performance

**Implementation Priority**: P1 (Medium)
**Estimated Effort**: 2-3 weeks

---

### 6. Attrition & Retention Analytics

#### Metrics to Track

| Metric | Formula | Industry Benchmark |
|--------|---------|-------------------|
| **Attrition Rate** | (Exits / Avg Headcount) × 100 | 10-15% annual |
| **Voluntary Attrition** | Voluntary exits / Total exits | < 80% |
| **Regrettable Attrition** | High performer exits / Total exits | < 5% |
| **Tenure at Exit** | Average tenure of exits | > 2 years |
| **Exit Interview Completion** | Completed interviews / exits | > 90% |
| **Retention Rate** | (1 - Attrition Rate) × 100 | > 85% |

**Cohort Analysis**:
- Retention by hire year
- Survival analysis (Kaplan-Meier curves)
- Attrition by department, level, location

**Root Cause Analysis**:
- Top reasons for leaving (exit interview data)
- Attrition correlation with compensation, performance, tenure

**Visualizations**:
- Attrition trend line
- Cohort retention curves
- Exit reason breakdown
- High-risk employee list

**Implementation Priority**: P0 (Critical)
**Estimated Effort**: 3 weeks

---

### 7. Engagement Analytics

#### Survey Analytics

**Metrics**:
- eNPS (Employee Net Promoter Score)
- Survey response rate
- Engagement score by department
- Engagement trend over time
- Question-level analysis
- Sentiment analysis

**Advanced Insights**:
- Engagement-performance correlation
- Engagement-attrition correlation
- Driver analysis (what impacts engagement most)

**Implementation Priority**: P1 (Medium)
**Estimated Effort**: 2 weeks

---

### 8. Learning & Development Analytics

**Metrics**:
- Training hours per employee
- Course completion rate
- Certification attainment
- Training ROI (performance improvement post-training)
- Skill gap closure rate
- Learning path progress

**Implementation Priority**: P2 (Low)
**Estimated Effort**: 1-2 weeks

---

## Dashboard Requirements

### 1. Executive Dashboard

**Audience**: C-Suite, VP HR

**Key Metrics**:
- Total headcount & trend
- Attrition rate & trend
- Average tenure
- Cost per employee
- Engagement score (eNPS)
- Open positions
- Gender diversity ratio
- High performer count

**Layout**:
```
┌─────────────────────────────────────────────┐
│  Executive Dashboard                         │
├─────────────────────────────────────────────┤
│                                              │
│  [Headcount]  [Attrition]  [eNPS]  [Cost]   │
│     1,247        12.5%       +35    $8.2K   │
│                                              │
│  ┌────────────────────┐  ┌─────────────────┐│
│  │ Headcount Trend    │  │ Attrition Trend ││
│  │  [Line Chart]      │  │  [Line Chart]   ││
│  └────────────────────┘  └─────────────────┘│
│                                              │
│  ┌────────────────────┐  ┌─────────────────┐│
│  │ Dept Distribution  │  │ Diversity       ││
│  │  [Donut Chart]     │  │  [Bar Chart]    ││
│  └────────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────┘
```

**Refresh Rate**: Real-time (with 1-hour cache)

**Implementation Priority**: P0
**Estimated Effort**: 3 weeks

---

### 2. HR Operations Dashboard

**Audience**: HR Managers, HR Business Partners

**Sections**:

#### A. Attendance Overview
- Today's attendance %
- Late arrivals
- Pending regularizations
- Weekly trend

#### B. Leave Overview
- Pending approvals
- Team availability today
- Upcoming leaves (next 7 days)
- Leave balance alerts

#### C. Recruitment Pipeline
- Open positions
- Candidates in pipeline
- Interviews scheduled
- Offers pending

#### D. Onboarding
- New joiners this month
- Onboarding tasks pending
- Documents pending

**Implementation Priority**: P0
**Estimated Effort**: 3 weeks

---

### 3. Manager Dashboard

**Audience**: People Managers

**Key Metrics**:
- Team size
- Team attendance today
- Pending approvals (leaves, expenses, etc.)
- Team performance distribution
- Attrition risk in team
- 1:1 meetings due

**Team View**:
- Employee list with key metrics
- Quick actions (approve, reject)
- Team calendar

**Implementation Priority**: P1
**Estimated Effort**: 2-3 weeks

---

### 4. Employee Dashboard

**Audience**: All Employees

**Sections**:
- My attendance summary
- Leave balance
- Upcoming holidays
- Payslip access
- Learning progress
- Performance goals
- Pending actions

**Implementation Priority**: P1
**Estimated Effort**: 2 weeks

---

### 5. Predictive Analytics Dashboard

**Audience**: HR Leadership, Data Analysts

**Insights**:
- Attrition risk employees
- Skill gap analysis
- Hiring forecast
- Budget projections
- Workforce planning recommendations

**Implementation Priority**: P1
**Estimated Effort**: 4-5 weeks (includes ML models)

---

## Predictive Analytics Features

### 1. Attrition Prediction

#### Objective
Identify employees at risk of leaving in the next 3-6 months.

#### Data Inputs
| Feature | Source | Weight |
|---------|--------|--------|
| Tenure | Employee record | High |
| Last salary increment | Compensation | High |
| Performance rating | Performance review | Medium |
| Promotion gap | Career progression | High |
| Engagement score | Surveys | High |
| Attendance pattern | Attendance | Medium |
| Leave pattern | Leave records | Medium |
| Age | Demographics | Low |
| Manager changes | Reporting structure | Medium |

#### ML Model Approach

**Model Type**: Logistic Regression / Random Forest / Gradient Boosting

**Training Data**:
- Historical employee data (last 3 years)
- Labeled with actual exits (1) and retentions (0)
- Minimum 500 employee records

**Features Engineering**:
```python
# Example features
- tenure_months
- months_since_last_increment
- increment_percentage
- performance_rating_trend (last 3 reviews)
- engagement_score_change
- absence_rate_last_90_days
- manager_change_count
- promotion_delay (months since eligible)
```

**Output**:
- Attrition probability (0-100%)
- Risk level: LOW (0-30%), MEDIUM (30-60%), HIGH (60-80%), CRITICAL (80-100%)
- Top contributing factors
- Recommended retention actions

**Validation**:
- Train/test split: 80/20
- Cross-validation (K-fold)
- Target metrics: AUC-ROC > 0.75, Precision > 0.70

**Implementation**:
```java
// Service method signature
public AttritionPredictionDto predictAttrition(UUID employeeId) {
    // 1. Fetch employee features
    // 2. Call ML model (Python microservice or PMML)
    // 3. Calculate risk score
    // 4. Identify contributing factors
    // 5. Generate retention recommendations
    // 6. Save prediction to database
    // 7. Trigger alerts if HIGH/CRITICAL
    return predictionDto;
}
```

**Estimated Effort**: 4-6 weeks (including model development)

---

### 2. Skill Gap Analysis

#### Objective
Identify critical skill shortages across the organization.

#### Approach

**Step 1: Skill Inventory**
- Current skills of employees
- Skill levels (1-5 proficiency)

**Step 2: Skill Requirements**
- Job role requirements
- Project/department needs
- Future skill needs (strategic)

**Step 3: Gap Analysis**
```
Gap = Required Skills - Current Skills
```

**Step 4: Prioritization**
- Business criticality
- Ease of training
- Market availability

**Output**:
| Skill | Current Supply | Required | Gap | Priority | Action |
|-------|---------------|----------|-----|----------|--------|
| Python | 15 employees | 25 | -10 | High | Hire/Train |
| Cloud Architecture | 5 | 10 | -5 | Critical | Hire |
| Leadership | 20 | 25 | -5 | Medium | Train |

**Visualizations**:
- Skill gap heatmap
- Priority skill list
- Department-wise gaps
- Role-wise gaps

**Estimated Effort**: 2-3 weeks

---

### 3. Performance Prediction

#### Objective
Predict performance ratings for next review cycle.

#### Inputs
- Historical performance ratings
- Goal achievement %
- Peer feedback scores
- Manager assessment
- Training completion
- Attendance/punctuality
- Project contributions

#### Model
- Regression model (predict rating 1-5)
- Classification model (predict band: Low/Medium/High)

#### Use Cases
- Identify underperformers early
- Target coaching/training
- Succession planning

**Estimated Effort**: 3-4 weeks

---

### 4. Hiring Forecast

#### Objective
Predict hiring needs for next 6-12 months.

#### Inputs
- Historical hiring trends
- Attrition forecast
- Business growth plans
- Seasonality
- Budget constraints

#### Model
- Time series forecasting (ARIMA, Prophet)
- Regression models

#### Output
- Monthly hiring targets by department
- Budget requirements
- Recommended headcount

**Estimated Effort**: 2-3 weeks

---

### 5. Workforce Planning

#### Objective
Optimize workforce allocation and planning.

#### Features
- Demand forecasting (project/department needs)
- Supply planning (current + hiring pipeline)
- Succession planning (identify successors)
- Career path recommendations

**Estimated Effort**: 4-5 weeks

---

## KPIs & Metrics

### Metric Categories

#### 1. Workforce Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Headcount | Total active employees | Aligned with budget |
| FTE | Full-time equivalents | - |
| Span of Control | Employees per manager | 5-10 |
| Vacancy Rate | Open positions / Total positions | < 5% |

#### 2. Recruitment Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Time to Hire | Offer date - Posting date | < 30 days |
| Cost per Hire | Total recruitment cost / Hires | Industry benchmark |
| Offer Acceptance Rate | Accepted / Offered × 100 | > 85% |
| Source Effectiveness | Hires / Applications by source | Optimize |

#### 3. Retention Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Attrition Rate | (Exits / Avg Headcount) × 100 | < 15% annual |
| Retention Rate | (1 - Attrition) × 100 | > 85% |
| Tenure | Average years of service | > 3 years |
| Regrettable Attrition | High performer exits / Total exits | < 10% |

#### 4. Performance Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Avg Performance Rating | Sum(Ratings) / Employees | 3.5-4.0 |
| Goal Achievement | Completed goals / Total goals × 100 | > 80% |
| Review Completion | Completed reviews / Due reviews × 100 | 100% |

#### 5. Engagement Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| eNPS | % Promoters - % Detractors | > 30 |
| Survey Response Rate | Responses / Invitations × 100 | > 70% |
| Engagement Score | Avg survey score | > 4.0/5 |

#### 6. Learning Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Training Hours per Employee | Total hours / Employees | > 40 hours/year |
| Course Completion Rate | Completed / Enrolled × 100 | > 80% |
| Skill Proficiency Growth | Avg skill level change | Positive trend |

#### 7. Financial Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Cost per Employee | Total HR cost / Employees | Industry benchmark |
| Revenue per Employee | Revenue / Employees | Industry benchmark |
| HR Cost Ratio | HR costs / Total costs × 100 | 2-5% |

---

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────────────┐
│           Frontend (React/Vue)                   │
│  Dashboards, Charts, Real-time Updates          │
└──────────────────┬──────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────┐
│        Analytics Controllers                     │
│  DashboardController, AnalyticsController        │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│        Analytics Services                        │
│  - DashboardService                              │
│  - AdvancedAnalyticsService                      │
│  - PredictiveAnalyticsService                    │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
┌────────▼────────┐  ┌──────▼──────────────────┐
│  Data Layer     │  │  ML Service (Python)    │
│  - Repositories │  │  - Flask/FastAPI        │
│  - Aggregation  │  │  - Scikit-learn         │
│  - Views        │  │  - TensorFlow           │
└─────────────────┘  └─────────────────────────┘
```

### Technology Stack

#### Backend (Java)

| Component | Technology |
|-----------|-----------|
| **Framework** | Spring Boot 3.2 |
| **Database** | PostgreSQL 16 |
| **Caching** | Redis |
| **Query** | JPA/Hibernate + Native SQL |
| **Async Processing** | Spring @Async, CompletableFuture |

#### ML Service (Python)

| Component | Technology |
|-----------|-----------|
| **Framework** | Flask / FastAPI |
| **ML Library** | Scikit-learn, XGBoost |
| **Data** | Pandas, NumPy |
| **Model Serving** | PMML or REST API |

#### Frontend

| Component | Technology |
|-----------|-----------|
| **Framework** | React / Vue.js |
| **Charts** | Chart.js, D3.js, Recharts |
| **State** | Redux / Zustand |
| **Real-time** | WebSocket / Server-Sent Events |

---

### Database Optimization

#### 1. Materialized Views

Create pre-aggregated views for common queries:

```sql
-- Headcount by department (daily refresh)
CREATE MATERIALIZED VIEW mv_headcount_by_department AS
SELECT
    d.id as department_id,
    d.name as department_name,
    COUNT(e.id) as headcount,
    COUNT(CASE WHEN e.status = 'ACTIVE' THEN 1 END) as active_count,
    CURRENT_DATE as snapshot_date
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
GROUP BY d.id, d.name;

-- Refresh daily via scheduled job
REFRESH MATERIALIZED VIEW mv_headcount_by_department;
```

#### 2. Analytical Queries

Use window functions for trends:

```sql
-- Attrition trend by month
SELECT
    DATE_TRUNC('month', exit_date) as month,
    COUNT(*) as exits,
    LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', exit_date)) as prev_month_exits,
    (COUNT(*) - LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', exit_date))) as change
FROM employees
WHERE exit_date IS NOT NULL
GROUP BY DATE_TRUNC('month', exit_date)
ORDER BY month DESC;
```

#### 3. Indexes

Create indexes for analytics queries:

```sql
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_department_status ON employees(department_id, status);
CREATE INDEX idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX idx_employees_exit_date ON employees(exit_date) WHERE exit_date IS NOT NULL;
```

---

### Caching Strategy

#### Cache Layers

| Layer | TTL | Use Case |
|-------|-----|----------|
| **L1: Application** | 5 minutes | Current day metrics |
| **L2: Redis** | 1 hour | Dashboard data |
| **L3: Materialized Views** | 24 hours | Historical aggregations |

#### Implementation

```java
@Service
public class DashboardService {

    @Cacheable(value = "dashboard:executive", key = "#tenantId", ttl = 3600)
    public ExecutiveDashboardDto getExecutiveDashboard(UUID tenantId) {
        // Expensive aggregation queries
        // Results cached for 1 hour
    }

    @CacheEvict(value = "dashboard:*", allEntries = true)
    public void refreshDashboards() {
        // Manual refresh endpoint
    }
}
```

---

### Real-time Updates

#### Server-Sent Events (SSE)

```java
@GetMapping(value = "/dashboard/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ServerSentEvent<DashboardUpdateDto>> streamDashboardUpdates() {
    return Flux.interval(Duration.ofSeconds(30))
        .map(seq -> ServerSentEvent.<DashboardUpdateDto>builder()
            .data(getDashboardUpdates())
            .build());
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Months 1-2) - ✅ COMPLETED

**Status**: COMPLETED on December 17, 2025

**Weeks 1-2: Database & Queries**
- ✅ Create materialized views
- ✅ Optimize indexes
- ✅ Write aggregation queries
- ✅ Test query performance

**Weeks 3-4: Core Metrics**
- ✅ Headcount analytics
- ✅ Attendance analytics
- ✅ Leave analytics

**Weeks 5-6: Role-Based Dashboards (Backend)**
- ✅ Executive dashboard (DashboardsController + ExecutiveDashboardService)
- ✅ Manager dashboard (DashboardsController + ManagerDashboardService)
- ✅ Employee dashboard (DashboardsController + EmployeeDashboardService)
- ✅ HR operations dashboard (enhanced)
- ✅ Dashboard widgets API
- ✅ Smart dashboard routing (/my endpoint)

**Weeks 7-8: Integration & RBAC**
- ✅ 5 new permissions added (DASHBOARD:EXECUTIVE, HR_OPS, MANAGER, EMPLOYEE, WIDGETS)
- ✅ Repository enhancements for analytics queries
- ✅ Comprehensive DTOs with nested response classes
- ⏳ Frontend Integration (pending - Phase 2)

**Deliverables**:
- Complete backend for 4 role-based dashboards
- 12 new API endpoints
- 5 new RBAC permissions
- Repository layer enhancements

---

### Phase 2: Advanced Analytics (Months 3-4)

**Weeks 1-2: Performance Analytics**
- ✅ Performance distribution
- ✅ Goal tracking
- ✅ Manager analytics

**Weeks 3-4: Recruitment Analytics**
- ✅ Pipeline metrics
- ✅ Time to hire
- ✅ Source effectiveness

**Weeks 5-6: Attrition Analytics**
- ✅ Attrition trends
- ✅ Cohort analysis
- ✅ Exit reasons

**Weeks 7-8: Engagement Analytics**
- ✅ Survey analytics
- ✅ eNPS calculation
- ✅ Sentiment analysis

**Deliverables**: Comprehensive analytics across all HR functions

---

### Phase 3: Predictive Analytics (Months 5-6)

**Weeks 1-2: ML Infrastructure**
- ✅ Python service setup
- ✅ Data pipeline
- ✅ Feature engineering

**Weeks 3-4: Attrition Prediction**
- ✅ Model training
- ✅ Integration with HRMS
- ✅ Dashboard integration

**Weeks 5-6: Skill Gap Analysis**
- ✅ Skill inventory
- ✅ Gap calculation
- ✅ Priority scoring

**Weeks 7-8: Workforce Planning**
- ✅ Hiring forecast
- ✅ Succession planning
- ✅ Recommendations engine

**Deliverables**: AI-powered predictive analytics

---

### Phase 4: Polish & Optimization (Month 7)

**Weeks 1-2: Performance**
- ✅ Query optimization
- ✅ Caching improvements
- ✅ Load testing

**Weeks 3-4: User Experience**
- ✅ Mobile responsiveness
- ✅ Export capabilities
- ✅ Custom date ranges
- ✅ Filters & drill-downs

**Deliverables**: Production-ready analytics platform

---

## Success Metrics

### Adoption Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| **Daily Active Users (DAU)** | > 50% of HR team | Month 3 |
| **Dashboard Views/Day** | > 100 views | Month 3 |
| **Export Usage** | > 20 exports/week | Month 4 |
| **API Response Time** | < 1 second | Month 2 |

### Business Impact

| Metric | Target | Timeline |
|--------|--------|----------|
| **Attrition Prediction Accuracy** | > 75% AUC-ROC | Month 6 |
| **Time Saved on Reporting** | 10 hours/week | Month 4 |
| **Data-Driven Decisions** | > 80% of decisions | Month 6 |
| **User Satisfaction** | > 4.0/5 rating | Month 7 |

### Technical Metrics

| Metric | Target |
|--------|--------|
| **Dashboard Load Time** | < 2 seconds |
| **API Uptime** | > 99.5% |
| **Cache Hit Rate** | > 80% |
| **Query Execution Time** | < 500ms |

---

## Conclusion

This roadmap provides a comprehensive plan to build a **best-in-class analytics and dashboards suite** for the NuLogic HRMS platform.

### Progress Summary

| Phase | Status | Completion |
|-------|--------|------------|
| **Phase 1: Foundation** | ✅ COMPLETED | December 17, 2025 |
| **Phase 2: Advanced Analytics** | ⏳ Pending | Planned |
| **Phase 3: Predictive Analytics** | ⏳ Pending | Planned |
| **Phase 4: Polish & Optimization** | ⏳ Pending | Planned |

### Phase 1 Achievements

- **4 Role-Based Dashboards**: Executive, Manager, Employee, HR Operations
- **12 New API Endpoints**: Complete CRUD and analytics endpoints
- **5 New Permissions**: RBAC integration for dashboard access control
- **3 New Services**: ExecutiveDashboardService, ManagerDashboardService, EmployeeDashboardService
- **Repository Enhancements**: Added analytics queries to 5 repositories

**Key Highlights**:

1. **Complete Analytics Coverage**: From basic metrics to AI-powered predictions
2. **Phased Approach**: 7-month timeline with clear milestones
3. **Business Value**: Actionable insights for better HR decisions
4. **Technical Excellence**: Optimized queries, caching, real-time updates
5. **User-Centric**: Dashboards for every persona (executives, managers, employees)

**Expected Outcomes**:
- **Reduce attrition** by identifying at-risk employees early
- **Optimize hiring** with recruitment analytics
- **Improve engagement** through data-driven interventions
- **Save time** with automated reporting
- **Enable strategic planning** with workforce forecasting

### Next Steps (Phase 2)

1. Build frontend UI for Executive Dashboard
2. Build frontend UI for Manager Dashboard
3. Build frontend UI for Employee Dashboard
4. Implement caching layer for performance
5. Add real-time updates (SSE/WebSocket)

---

**Document Version**: 1.1
**Last Updated**: December 17, 2025
**Phase 1 Completed**: December 17, 2025
**Next Review**: January 2026
**Owner**: Analytics & Data Science Team
