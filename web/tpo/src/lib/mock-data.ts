// Mock data for TPO Panel

export const kpiData = [
  { label: "Active Drives", value: 24, change: "+3 this week", icon: "briefcase" },
  { label: "Total Students", value: 1847, change: "across 6 branches", icon: "users" },
  { label: "Applications This Week", value: 312, change: "+18% vs last week", icon: "file-text" },
  { label: "Interviews Scheduled", value: 47, change: "next 7 days", icon: "calendar" },
  { label: "Offers Received", value: 186, change: "82% acceptance", icon: "award" },
  { label: "Joined Confirmed", value: 142, change: "76% of offers", icon: "check-circle" },
];

export const funnelData = [
  { stage: "Applied", count: 1423, color: "hsl(238, 55%, 48%)" },
  { stage: "OA Cleared", count: 892, color: "hsl(238, 55%, 55%)" },
  { stage: "Interview", count: 534, color: "hsl(260, 50%, 55%)" },
  { stage: "Offer", count: 186, color: "hsl(152, 60%, 42%)" },
  { stage: "Joined", count: 142, color: "hsl(152, 60%, 35%)" },
];

export const todaySchedule = [
  { time: "09:00 AM", event: "Online Assessment", drive: "Google SDE Intern", students: 45 },
  { time: "10:30 AM", event: "Technical Interview", drive: "Microsoft SWE", students: 12 },
  { time: "02:00 PM", event: "HR Round", drive: "Amazon SDE-1", students: 8 },
  { time: "03:30 PM", event: "Group Discussion", drive: "Deloitte Analyst", students: 20 },
  { time: "05:00 PM", event: "Online Assessment", drive: "Flipkart SDE", students: 38 },
];

export const activityLog = [
  { action: "Drive created", detail: "Google SDE Intern 2026", time: "2 hours ago", user: "Dr. Sharma" },
  { action: "Eligibility updated", detail: "Microsoft SWE — added IT branch", time: "3 hours ago", user: "Prof. Gupta" },
  { action: "Announcement sent", detail: "Resume submission deadline reminder", time: "5 hours ago", user: "Dr. Sharma" },
  { action: "Offer updated", detail: "Amazon SDE-1 — 3 new offers", time: "6 hours ago", user: "System" },
  { action: "Drive closed", detail: "TCS Digital hiring completed", time: "1 day ago", user: "Prof. Gupta" },
  { action: "Student flagged", detail: "Roll #2024CSE045 — incomplete profile", time: "1 day ago", user: "Dr. Sharma" },
];

export const drivesData = [
  { id: "1", title: "SDE Intern 2026", company: "Google", deadline: "2026-03-15", eligible: 342, applicants: 218, status: "Active", verified: true },
  { id: "2", title: "SWE Full-time", company: "Microsoft", deadline: "2026-03-10", eligible: 289, applicants: 176, status: "Active", verified: true },
  { id: "3", title: "SDE-1", company: "Amazon", deadline: "2026-03-08", eligible: 410, applicants: 312, status: "Active", verified: true },
  { id: "4", title: "Analyst Program", company: "Deloitte", deadline: "2026-03-20", eligible: 520, applicants: 89, status: "Active", verified: true },
  { id: "5", title: "SDE Intern", company: "Flipkart", deadline: "2026-03-12", eligible: 298, applicants: 201, status: "Active", verified: true },
  { id: "6", title: "Digital Hiring", company: "TCS", deadline: "2026-02-25", eligible: 680, applicants: 542, status: "Closed", verified: true },
  { id: "7", title: "Software Engineer", company: "Adobe", deadline: "2026-03-18", eligible: 265, applicants: 145, status: "Active", verified: true },
  { id: "8", title: "Data Scientist", company: "PhonePe", deadline: "2026-02-28", eligible: 180, applicants: 98, status: "Deadline Soon", verified: true },
];

export const studentsData = [
  { id: "1", name: "Aarav Patel", branch: "CSE", batch: "2026", cgpa: 9.2, status: "Placed", applications: 8, offers: 2 },
  { id: "2", name: "Priya Sharma", branch: "CSE", batch: "2026", cgpa: 8.8, status: "In Process", applications: 12, offers: 1 },
  { id: "3", name: "Rohan Mehta", branch: "IT", batch: "2026", cgpa: 8.5, status: "In Process", applications: 6, offers: 0 },
  { id: "4", name: "Sneha Reddy", branch: "ECE", batch: "2026", cgpa: 9.0, status: "Placed", applications: 5, offers: 3 },
  { id: "5", name: "Vikram Singh", branch: "CSE", batch: "2026", cgpa: 7.8, status: "Unplaced", applications: 15, offers: 0 },
  { id: "6", name: "Ananya Gupta", branch: "IT", batch: "2026", cgpa: 8.3, status: "In Process", applications: 9, offers: 0 },
  { id: "7", name: "Karthik Nair", branch: "ME", batch: "2026", cgpa: 7.5, status: "Unplaced", applications: 3, offers: 0 },
  { id: "8", name: "Meera Joshi", branch: "CSE", batch: "2026", cgpa: 9.5, status: "Placed", applications: 4, offers: 4 },
  { id: "9", name: "Arjun Kumar", branch: "ECE", batch: "2026", cgpa: 8.1, status: "In Process", applications: 7, offers: 1 },
  { id: "10", name: "Divya Iyer", branch: "CSE", batch: "2027", cgpa: 8.9, status: "Not Started", applications: 0, offers: 0 },
];

export const applicationsData = [
  { id: "1", company: "Google", role: "SDE Intern", student: "Aarav Patel", status: "Interview", appliedOn: "2026-02-10", nextEvent: "Technical Round — Mar 5", outcome: "Pending" },
  { id: "2", company: "Microsoft", role: "SWE", student: "Priya Sharma", status: "Offer", appliedOn: "2026-02-08", nextEvent: "—", outcome: "Selected" },
  { id: "3", company: "Amazon", role: "SDE-1", student: "Rohan Mehta", status: "OA", appliedOn: "2026-02-12", nextEvent: "OA — Mar 3", outcome: "Pending" },
  { id: "4", company: "Deloitte", role: "Analyst", student: "Sneha Reddy", status: "Applied", appliedOn: "2026-02-20", nextEvent: "GD — Mar 8", outcome: "Pending" },
  { id: "5", company: "Google", role: "SDE Intern", student: "Meera Joshi", status: "Offer", appliedOn: "2026-02-10", nextEvent: "—", outcome: "Selected" },
  { id: "6", company: "Flipkart", role: "SDE Intern", student: "Vikram Singh", status: "Rejected", appliedOn: "2026-02-14", nextEvent: "—", outcome: "Not Selected" },
  { id: "7", company: "Adobe", role: "Software Engineer", student: "Ananya Gupta", status: "Interview", appliedOn: "2026-02-15", nextEvent: "HR Round — Mar 6", outcome: "Pending" },
  { id: "8", company: "TCS", role: "Digital", student: "Karthik Nair", status: "Offer", appliedOn: "2026-01-20", nextEvent: "—", outcome: "Selected" },
  { id: "9", company: "Amazon", role: "SDE-1", student: "Arjun Kumar", status: "Interview", appliedOn: "2026-02-12", nextEvent: "System Design — Mar 4", outcome: "Pending" },
  { id: "10", company: "PhonePe", role: "Data Scientist", student: "Divya Iyer", status: "Applied", appliedOn: "2026-02-24", nextEvent: "OA — Mar 10", outcome: "Pending" },
];

export const announcementsData = [
  { id: "1", title: "Resume Submission Deadline Extended", target: "All Students", createdAt: "2026-02-25", delivered: 1847, opened: 1203, pinned: true },
  { id: "2", title: "Google Drive — OA Instructions", target: "Google SDE Applicants", createdAt: "2026-02-24", delivered: 218, opened: 195, pinned: false },
  { id: "3", title: "Placement Policy Update 2026", target: "All Students", createdAt: "2026-02-20", delivered: 1847, opened: 1456, pinned: false },
  { id: "4", title: "Mock Interview Schedule", target: "CSE & IT — Batch 2026", createdAt: "2026-02-18", delivered: 623, opened: 489, pinned: false },
  { id: "5", title: "Microsoft SWE — Interview Tips", target: "Microsoft SWE Applicants", createdAt: "2026-02-15", delivered: 176, opened: 162, pinned: false },
];

export const analyticsChartData = {
  funnel: [
    { name: "Applied", value: 1423 },
    { name: "OA", value: 892 },
    { name: "Interview", value: 534 },
    { name: "Offer", value: 186 },
    { name: "Joined", value: 142 },
  ],
  companyPerformance: [
    { company: "Google", applications: 218, offers: 12, conversion: 5.5 },
    { company: "Microsoft", applications: 176, offers: 18, conversion: 10.2 },
    { company: "Amazon", applications: 312, offers: 25, conversion: 8.0 },
    { company: "Deloitte", applications: 89, offers: 32, conversion: 36.0 },
    { company: "TCS", applications: 542, offers: 85, conversion: 15.7 },
    { company: "Adobe", applications: 145, offers: 8, conversion: 5.5 },
    { company: "Flipkart", applications: 201, offers: 14, conversion: 7.0 },
  ],
  branchInsights: [
    { branch: "CSE", placed: 89, total: 320, percentage: 27.8 },
    { branch: "IT", placed: 52, total: 280, percentage: 18.6 },
    { branch: "ECE", placed: 38, total: 310, percentage: 12.3 },
    { branch: "EE", placed: 22, total: 250, percentage: 8.8 },
    { branch: "ME", placed: 15, total: 340, percentage: 4.4 },
    { branch: "CE", placed: 12, total: 347, percentage: 3.5 },
  ],
  weeklyTrends: [
    { week: "W1 Feb", applications: 180, offers: 12 },
    { week: "W2 Feb", applications: 245, offers: 18 },
    { week: "W3 Feb", applications: 312, offers: 24 },
    { week: "W4 Feb", applications: 290, offers: 31 },
    { week: "W1 Mar", applications: 350, offers: 28 },
  ],
};

export const branches = ["CSE", "IT", "ECE", "EE", "ME", "CE"];
export const batches = ["2024", "2025", "2026", "2027"];
export const statusOptions = ["Active", "Closed", "Deadline Soon"];
export const applicationStatuses = ["Applied", "OA", "Interview", "Offer", "Rejected", "Joined"];
export const placementStatuses = ["Placed", "In Process", "Unplaced", "Not Started"];
