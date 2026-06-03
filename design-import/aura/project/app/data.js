/* NU-AURA Aura — shared mock data + helpers (plain JS, window.NU) */
(function () {
  const avatarColors = ['#2952A3','#0ea5a3','#d97706','#8b5cf6','#db2777','#0891b2','#4f46e5','#65a30d'];
  function colorFor(name) {
    let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return avatarColors[h % avatarColors.length];
  }
  function initials(name) {
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase();
  }

  const employees = [
    { id:'E-1042', name:'Priya Nair', email:'priya.nair@acme.co', role:'Sr. Software Engineer', dept:'Engineering', loc:'Bangalore', type:'Full-time', joined:'Mar 2021', status:'Active', mgr:'Arjun Mehta', phone:'+91 98••• 12', comp:'$148,000' },
    { id:'E-0931', name:'James Okafor', email:'james.o@acme.co', role:'Account Executive', dept:'Sales', loc:'Lagos', type:'Full-time', joined:'Jul 2022', status:'Active', mgr:'Dana White', phone:'+234 80••• 55', comp:'$96,000' },
    { id:'E-1188', name:'Sana Rahman', email:'sana.r@acme.co', role:'Product Designer', dept:'Design', loc:'Dubai', type:'Full-time', joined:'Jan 2023', status:'On Leave', mgr:'Lena Park', phone:'+971 50••• 09', comp:'$112,000' },
    { id:'E-0772', name:'Diego Santos', email:'diego.s@acme.co', role:'DevOps Engineer', dept:'Engineering', loc:'São Paulo', type:'Full-time', joined:'Sep 2020', status:'Active', mgr:'Arjun Mehta', phone:'+55 11••• 31', comp:'$134,000' },
    { id:'E-1290', name:'Mei Lin', email:'mei.lin@acme.co', role:'Finance Analyst', dept:'Finance', loc:'Singapore', type:'Full-time', joined:'May 2023', status:'Active', mgr:'Robert Cole', phone:'+65 81••• 77', comp:'$98,000' },
    { id:'E-0654', name:'Tomas Becker', email:'tomas.b@acme.co', role:'Engineering Manager', dept:'Engineering', loc:'Berlin', type:'Full-time', joined:'Feb 2019', status:'Active', mgr:'Arjun Mehta', phone:'+49 30••• 44', comp:'$176,000' },
    { id:'E-1355', name:'Aisha Bello', email:'aisha.b@acme.co', role:'People Operations', dept:'People', loc:'Lagos', type:'Full-time', joined:'Aug 2023', status:'Active', mgr:'Lena Park', phone:'+234 80••• 18', comp:'$84,000' },
    { id:'E-1401', name:'Carlos Vega', email:'carlos.v@acme.co', role:'Sales Development Rep', dept:'Sales', loc:'Mexico City', type:'Contract', joined:'Oct 2024', status:'Probation', mgr:'Dana White', phone:'+52 55••• 62', comp:'$62,000' },
    { id:'E-0820', name:'Hana Kim', email:'hana.k@acme.co', role:'Brand Designer', dept:'Design', loc:'Seoul', type:'Full-time', joined:'Apr 2021', status:'Active', mgr:'Lena Park', phone:'+82 10••• 90', comp:'$104,000' },
    { id:'E-1477', name:'Omar Haddad', email:'omar.h@acme.co', role:'Support Lead', dept:'Operations', loc:'Cairo', type:'Full-time', joined:'Dec 2022', status:'Active', mgr:'Robert Cole', phone:'+20 10••• 23', comp:'$88,000' },
    { id:'E-1512', name:'Elena Rossi', email:'elena.r@acme.co', role:'Recruiter', dept:'People', loc:'Milan', type:'Full-time', joined:'Jun 2023', status:'Active', mgr:'Lena Park', phone:'+39 34••• 71', comp:'$79,000' },
    { id:'E-0588', name:'Noah Bennett', email:'noah.b@acme.co', role:'Staff Engineer', dept:'Engineering', loc:'Austin', type:'Full-time', joined:'Nov 2018', status:'Active', mgr:'Tomas Becker', phone:'+1 512••• 40', comp:'$198,000' },
  ];

  const approvals = [
    { id:'REQ-4821', type:'Leave', who:'Priya Nair', role:'Sr. Software Engineer', dept:'Engineering', when:'12m ago', priority:'Normal', summary:'Vacation · 4 days', detail:{ Dates:'May 5 – May 9, 2026', Days:'4 working days', Balance:'14.5 days remaining', Reason:'Family vacation', Coverage:'Diego Santos' } },
    { id:'REQ-4820', type:'Expense', who:'James Okafor', role:'Account Executive', dept:'Sales', when:'42m ago', priority:'High', summary:'Client travel · $1,284.50', detail:{ Amount:'$1,284.50', Category:'Travel & Lodging', Merchant:'Lagos → Nairobi', Date:'Apr 28, 2026', Receipts:'3 attached' } },
    { id:'REQ-4817', type:'Leave', who:'Sana Rahman', role:'Product Designer', dept:'Design', when:'1h ago', priority:'Normal', summary:'Sick leave · 2 days', detail:{ Dates:'May 1 – May 2, 2026', Days:'2 working days', Balance:'8 days remaining', Reason:'Medical', Coverage:'Hana Kim' } },
    { id:'REQ-4815', type:'Offer', who:'Carlos Vega', role:'Sales Development Rep', dept:'Sales', when:'2h ago', priority:'High', summary:'New offer · Senior SDR', detail:{ Candidate:'Maria Lopez', Band:'L4 · $74,000', Start:'Jun 1, 2026', Approver:'Dana White', Stage:'Final approval' } },
    { id:'REQ-4810', type:'Asset', who:'Diego Santos', role:'DevOps Engineer', dept:'Engineering', when:'3h ago', priority:'Low', summary:'Equipment · MacBook Pro 16"', detail:{ Item:'MacBook Pro 16" M4', Cost:'$3,199.00', Reason:'Replacement — battery fault', Vendor:'Apple Business', Delivery:'Office — Berlin' } },
    { id:'REQ-4806', type:'Expense', who:'Omar Haddad', role:'Support Lead', dept:'Operations', when:'5h ago', priority:'Normal', summary:'Software · $480.00', detail:{ Amount:'$480.00', Category:'Software & Tools', Merchant:'Zendesk annual', Date:'Apr 26, 2026', Receipts:'1 attached' } },
  ];

  const activity = [
    { kind:'ok', icon:'user-plus', text:'<b>Nadia Khan</b> joined Engineering as Frontend Engineer', when:'12m ago' },
    { kind:'primary', icon:'check-circle-2', text:'Payroll cycle <b>March 2026</b> completed — 1,248 paid', when:'1h ago' },
    { kind:'warn', icon:'clock', text:'<b>9 timesheets</b> pending approval for last week', when:'3h ago' },
    { kind:'primary', icon:'file-text', text:'<b>Tomas Becker</b> published Q2 OKRs for Platform', when:'5h ago' },
    { kind:'neutral', icon:'log-out', text:'<b>Greg Hall</b> offboarding completed — assets returned', when:'Yesterday' },
    { kind:'ok', icon:'award', text:'<b>Mei Lin</b> received a peer recognition · Finance', when:'Yesterday' },
  ];

  // headcount trend (12 months)
  const headcountTrend = [1042,1061,1078,1090,1112,1135,1150,1168,1184,1203,1226,1248];
  const months = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'];
  // attendance donut
  const attendance = [ {label:'Present', value:1104, color:'var(--chart-1)'}, {label:'Remote', value:96, color:'var(--chart-3)'}, {label:'On leave', value:42, color:'var(--chart-4)'}, {label:'Absent', value:6, color:'var(--chart-5)'} ];
  // department headcount bars
  const departments = [ {label:'Engineering', value:486}, {label:'Sales', value:264}, {label:'Operations', value:188}, {label:'Design', value:96}, {label:'Finance', value:84}, {label:'People', value:64}, {label:'Other', value:66} ];
  // sparklines
  const sparks = {
    headcount: [12,18,15,22,20,26,24,30,28,34,33,40],
    present: [88,90,89,92,91,93,90,94,92,91,93,92],
    leave: [50,46,44,48,42,40,45,43,41,47,44,42],
    payroll: [3.8,3.9,3.9,4.0,4.0,4.1,4.0,4.1,4.15,4.18,4.2,4.2],
  };

  // attendance week strip (per person sample for attendance page)
  const leaveBalances = [
    { type:'Annual leave', used:6.5, total:21, color:'var(--chart-1)' },
    { type:'Sick leave', used:2, total:12, color:'var(--chart-3)' },
    { type:'Personal', used:1, total:5, color:'var(--chart-4)' },
    { type:'Comp off', used:0, total:3, color:'var(--chart-5)' },
  ];

  const payrollRuns = [
    { id:'PR-2026-04', period:'April 2026', pay:'Apr 30, 2026', status:'Processing', employees:1248, gross:'$4,218,540', net:'$3,142,880' },
    { id:'PR-2026-03', period:'March 2026', pay:'Mar 31, 2026', status:'Paid', employees:1226, gross:'$4,141,200', net:'$3,088,410' },
    { id:'PR-2026-02', period:'February 2026', pay:'Feb 28, 2026', status:'Paid', employees:1203, gross:'$4,066,910', net:'$3,031,250' },
    { id:'PR-2026-01', period:'January 2026', pay:'Jan 31, 2026', status:'Paid', employees:1184, gross:'$3,998,120', net:'$2,980,640' },
  ];

  const payrollByDept = [
    { dept:'Engineering', headcount:486, gross:'$1,842,300', pct:43.7 },
    { dept:'Sales', headcount:264, gross:'$868,400', pct:20.6 },
    { dept:'Operations', headcount:188, gross:'$512,900', pct:12.2 },
    { dept:'Design', headcount:96, gross:'$394,600', pct:9.4 },
    { dept:'Finance', headcount:84, gross:'$320,100', pct:7.6 },
    { dept:'People', headcount:64, gross:'$192,300', pct:4.6 },
  ];

  const assets = [
    { id:'AST-3920', name:'MacBook Pro 16"', cat:'Laptop', icon:'laptop', serial:'C02XJ09', assignee:'Priya Nair', loc:'Bangalore', status:'Assigned', date:'Mar 2024' },
    { id:'AST-3471', name:'Dell U2723QE', cat:'Monitor', icon:'monitor', serial:'CN-0H7', assignee:'Diego Santos', loc:'São Paulo', status:'Assigned', date:'Jan 2024' },
    { id:'AST-4102', name:'iPhone 15 Pro', cat:'Phone', icon:'smartphone', serial:'F2LX55', assignee:'James Okafor', loc:'Lagos', status:'Assigned', date:'Sep 2024' },
    { id:'AST-2890', name:'MacBook Air 13"', cat:'Laptop', icon:'laptop', serial:'C02RT41', assignee:'—', loc:'Warehouse', status:'Available', date:'Nov 2023' },
    { id:'AST-3655', name:'Logitech MX Keys', cat:'Peripheral', icon:'keyboard', serial:'2148LZ', assignee:'Mei Lin', loc:'Singapore', status:'Assigned', date:'May 2024' },
    { id:'AST-3088', name:'ThinkPad X1 Carbon', cat:'Laptop', icon:'laptop', serial:'PF3KQ2', assignee:'Tomas Becker', loc:'Berlin', status:'In repair', date:'Feb 2023' },
    { id:'AST-4310', name:'iPad Pro 11"', cat:'Tablet', icon:'tablet', serial:'DMPX90', assignee:'Hana Kim', loc:'Seoul', status:'Assigned', date:'Apr 2024' },
    { id:'AST-2740', name:'Dell P2419H', cat:'Monitor', icon:'monitor', serial:'CN-04F', assignee:'—', loc:'Warehouse', status:'Available', date:'Aug 2023' },
  ];
  const assetCats = [ {label:'Laptops', value:540}, {label:'Monitors', value:402}, {label:'Phones', value:188}, {label:'Peripherals', value:96}, {label:'Tablets', value:58} ];

  const benefitPlans = [
    { name:'Health · PPO', provider:'BlueCross', icon:'heart-pulse', color:'var(--chart-1)', enrolled:1186, total:1248, cost:'$412/mo', tier:'Employee + family' },
    { name:'Dental', provider:'Delta Dental', icon:'smile', color:'var(--chart-3)', enrolled:1042, total:1248, cost:'$38/mo', tier:'Employee + family' },
    { name:'Vision', provider:'VSP', icon:'eye', color:'var(--chart-5)', enrolled:864, total:1248, cost:'$14/mo', tier:'Employee only' },
    { name:'401(k)', provider:'Fidelity', icon:'piggy-bank', color:'var(--chart-4)', enrolled:1098, total:1248, cost:'6% match', tier:'Pre-tax' },
    { name:'Life & AD&D', provider:'MetLife', icon:'shield', color:'var(--chart-2)', enrolled:1248, total:1248, cost:'Company paid', tier:'2× salary' },
    { name:'Wellness', provider:'ClassPass', icon:'dumbbell', color:'#db2777', enrolled:612, total:1248, cost:'$25/mo', tier:'Optional' },
  ];

  const reports = [
    { name:'Headcount & growth', cat:'People', icon:'users', spark:[12,18,15,22,20,26,30,34,40], color:'var(--chart-1)', run:'2h ago' },
    { name:'Turnover & attrition', cat:'People', icon:'user-minus', spark:[8,7,9,6,7,5,6,4,5], color:'var(--chart-4)', run:'1d ago' },
    { name:'Payroll cost', cat:'Finance', icon:'banknote', spark:[38,39,40,40,41,41,42,42,42], color:'var(--chart-3)', run:'5h ago' },
    { name:'Diversity & inclusion', cat:'People', icon:'pie-chart', spark:[40,42,44,45,47,48,50,52,54], color:'var(--chart-5)', run:'3d ago' },
    { name:'Attendance trends', cat:'Operations', icon:'fingerprint', spark:[88,90,89,92,91,93,90,94,92], color:'var(--chart-2)', run:'4h ago' },
    { name:'Compensation bands', cat:'Finance', icon:'scale', spark:[20,22,21,24,23,25,26,27,28], color:'#0891b2', run:'1w ago' },
  ];

  const roles = [
    { name:'Super Admin', users:3, perms:512, scope:'All products', tone:'err' },
    { name:'HR Administrator', users:12, perms:418, scope:'NU-HRMS, NU-Hire', tone:'primary' },
    { name:'Payroll Manager', users:6, perms:142, scope:'Payroll, Benefits', tone:'primary' },
    { name:'Recruiter', users:18, perms:96, scope:'NU-Hire', tone:'neutral' },
    { name:'Manager', users:142, perms:64, scope:'Team scope', tone:'neutral' },
    { name:'Finance', users:9, perms:88, scope:'Payroll (read)', tone:'neutral' },
    { name:'Employee', users:1058, perms:24, scope:'Self-service', tone:'neutral' },
    { name:'Auditor', users:4, perms:36, scope:'Read-only', tone:'warn' },
    { name:'Contractor', users:31, perms:12, scope:'Limited', tone:'warn' },
  ];

  const integrations = [
    { name:'Slack', desc:'Approvals & notifications', icon:'message-square', on:true },
    { name:'Google Workspace', desc:'SSO & directory sync', icon:'mail', on:true },
    { name:'Okta', desc:'SCIM provisioning', icon:'key-round', on:true },
    { name:'QuickBooks', desc:'Payroll journal export', icon:'calculator', on:false },
    { name:'Greenhouse', desc:'ATS candidate sync', icon:'sprout', on:false },
    { name:'Zoom', desc:'Interview scheduling', icon:'video', on:true },
  ];

  window.NU = {
    colorFor, initials,
    employees, approvals, activity,
    headcountTrend, months, attendance, departments, sparks,
    leaveBalances, payrollRuns, payrollByDept,
    assets, assetCats, benefitPlans, reports, roles, integrations,
    user: { name:'Fayaz Ahmed', role:'HR Administrator', email:'fayaz@acme.co' },
    tenant: { name:'Acme Robotics', plan:'Enterprise · 1,248 seats' },
  };
})();
