export const currentUser = {
  name: "Arjun Mehta",
  email: "arjun.mehta@example.com",
  avatar: "AM",
  college: "IIT Bombay",
  branch: "Computer Science & Engineering",
  batch: "2025",
  cgpa: 8.72,
  phone: "+91 98765 43210",
  location: "Mumbai, India",
  linkedin: "linkedin.com/in/arjunmehta",
  github: "github.com/arjunmehta",
  portfolio: "arjunmehta.dev",
  skills: ["React", "TypeScript", "Node.js", "Python", "Machine Learning", "PostgreSQL", "Docker", "AWS"],
  summary: "Final year CS undergrad passionate about building scalable web applications and ML systems.",
};

export type JobSource = "Career Page" | "Telegram" | "Institute Verified" | "Extension" | "Manual";
export type ApplicationStatus = "Saved" | "Tailored" | "Applied" | "OA Scheduled" | "Interview Scheduled" | "Offer" | "Joined" | "Rejected" | "Withdrawn";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "Internship" | "Full-time";
  source: JobSource;
  matchScore: number;
  matchReasons: string[];
  lastSeen: string;
  description: string;
  skills: string[];
  applyUrl: string;
  postedDate: string;
}

export interface Application {
  id: string;
  jobId: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  matchScore: number;
  appliedOn: string;
  nextEvent?: string;
  nextEventDate?: string;
  resumeId?: string;
  notes: string;
}

export interface TailoredResume {
  id: string;
  company: string;
  role: string;
  generatedDate: string;
  status: "Ready" | "Generating" | "Failed";
  downloadUrl?: string;
}

export interface Notification {
  id: string;
  type: "match" | "reminder" | "announcement" | "update";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export const jobs: Job[] = [
  {
    id: "j1", title: "Software Engineer Intern", company: "Google", location: "Bangalore",
    type: "Internship", source: "Institute Verified", matchScore: 94,
    matchReasons: ["Strong DS/Algo skills", "Python + C++ match", "CGPA above cutoff"],
    lastSeen: "2 hours ago", description: "Join Google's Search team to work on ranking algorithms and distributed systems. You'll collaborate with world-class engineers on products used by billions.",
    skills: ["Python", "C++", "Distributed Systems", "Algorithms"], applyUrl: "#", postedDate: "2025-02-24",
  },
  {
    id: "j2", title: "Frontend Developer", company: "Razorpay", location: "Bangalore",
    type: "Full-time", source: "Career Page", matchScore: 89,
    matchReasons: ["React + TypeScript expertise", "Fintech interest", "Strong GitHub profile"],
    lastSeen: "5 hours ago", description: "Build and maintain Razorpay's merchant dashboard used by millions of businesses across India.",
    skills: ["React", "TypeScript", "Node.js", "GraphQL"], applyUrl: "#", postedDate: "2025-02-23",
  },
  {
    id: "j3", title: "ML Engineer Intern", company: "Microsoft", location: "Hyderabad",
    type: "Internship", source: "Institute Verified", matchScore: 87,
    matchReasons: ["ML coursework", "Python proficiency", "Research experience"],
    lastSeen: "1 day ago", description: "Work on Azure AI services, building and deploying machine learning models at scale.",
    skills: ["Python", "Machine Learning", "PyTorch", "Azure"], applyUrl: "#", postedDate: "2025-02-22",
  },
  {
    id: "j4", title: "Backend Developer", company: "Flipkart", location: "Bangalore",
    type: "Full-time", source: "Telegram", matchScore: 82,
    matchReasons: ["Node.js + PostgreSQL match", "System design skills"],
    lastSeen: "3 hours ago", description: "Scale Flipkart's order management system serving millions of transactions daily.",
    skills: ["Node.js", "PostgreSQL", "Redis", "Microservices"], applyUrl: "#", postedDate: "2025-02-24",
  },
  {
    id: "j5", title: "Full Stack Developer", company: "Zerodha", location: "Remote",
    type: "Full-time", source: "Career Page", matchScore: 78,
    matchReasons: ["Full-stack experience", "React + Node match"],
    lastSeen: "6 hours ago", description: "Build trading tools and platforms for India's largest stock broker.",
    skills: ["React", "Go", "PostgreSQL", "WebSocket"], applyUrl: "#", postedDate: "2025-02-21",
  },
  {
    id: "j6", title: "DevOps Intern", company: "Atlassian", location: "Bangalore",
    type: "Internship", source: "Extension", matchScore: 72,
    matchReasons: ["Docker experience", "AWS knowledge"],
    lastSeen: "12 hours ago", description: "Help automate CI/CD pipelines and improve infrastructure reliability.",
    skills: ["Docker", "AWS", "Kubernetes", "Terraform"], applyUrl: "#", postedDate: "2025-02-20",
  },
  {
    id: "j7", title: "Data Analyst", company: "Swiggy", location: "Bangalore",
    type: "Full-time", source: "Manual", matchScore: 65,
    matchReasons: ["SQL proficiency", "Python analytics"],
    lastSeen: "2 days ago", description: "Analyze delivery metrics and optimize operational efficiency using data.",
    skills: ["Python", "SQL", "Tableau", "Statistics"], applyUrl: "#", postedDate: "2025-02-19",
  },
  {
    id: "j8", title: "SDE Intern", company: "Amazon", location: "Hyderabad",
    type: "Internship", source: "Institute Verified", matchScore: 91,
    matchReasons: ["Strong coding profile", "System design coursework", "CGPA 8.7+"],
    lastSeen: "4 hours ago", description: "Build scalable services for Amazon's retail platform.",
    skills: ["Java", "AWS", "Distributed Systems", "Algorithms"], applyUrl: "#", postedDate: "2025-02-25",
  },
];

export const applications: Application[] = [
  { id: "a1", jobId: "j1", company: "Google", role: "Software Engineer Intern", status: "Interview Scheduled", matchScore: 94, appliedOn: "2025-02-20", nextEvent: "Technical Interview", nextEventDate: "2025-03-01", notes: "Round 2 scheduled" },
  { id: "a2", jobId: "j2", company: "Razorpay", role: "Frontend Developer", status: "OA Scheduled", matchScore: 89, appliedOn: "2025-02-21", nextEvent: "Online Assessment", nextEventDate: "2025-02-28", notes: "" },
  { id: "a3", jobId: "j3", company: "Microsoft", role: "ML Engineer Intern", status: "Applied", matchScore: 87, appliedOn: "2025-02-22", notes: "Applied via portal" },
  { id: "a4", jobId: "j4", company: "Flipkart", role: "Backend Developer", status: "Tailored", matchScore: 82, appliedOn: "", notes: "Resume generated" },
  { id: "a5", jobId: "j8", company: "Amazon", role: "SDE Intern", status: "Offer", matchScore: 91, appliedOn: "2025-02-10", notes: "Offer received! 🎉" },
  { id: "a6", jobId: "j5", company: "Zerodha", role: "Full Stack Developer", status: "Saved", matchScore: 78, appliedOn: "", notes: "" },
  { id: "a7", jobId: "j6", company: "Atlassian", role: "DevOps Intern", status: "Rejected", matchScore: 72, appliedOn: "2025-02-15", notes: "Did not clear OA" },
];

export const tailoredResumes: TailoredResume[] = [
  { id: "r1", company: "Google", role: "Software Engineer Intern", generatedDate: "2025-02-19", status: "Ready" },
  { id: "r2", company: "Razorpay", role: "Frontend Developer", generatedDate: "2025-02-20", status: "Ready" },
  { id: "r3", company: "Microsoft", role: "ML Engineer Intern", generatedDate: "2025-02-21", status: "Ready" },
  { id: "r4", company: "Flipkart", role: "Backend Developer", generatedDate: "2025-02-23", status: "Ready" },
];

export const notifications: Notification[] = [
  { id: "n1", type: "match", title: "New Match: Amazon SDE Intern", message: "91% match score — strong coding profile and system design coursework align perfectly.", timestamp: "2025-02-25T16:00:00", read: false, actionLabel: "View Job", actionUrl: "/jobs" },
  { id: "n2", type: "reminder", title: "OA Tomorrow: Razorpay", message: "Your online assessment for Frontend Developer at Razorpay is scheduled for Feb 28.", timestamp: "2025-02-25T14:00:00", read: false, actionLabel: "Open Tracker", actionUrl: "/tracker" },
  { id: "n3", type: "announcement", title: "TPO: TCS NQT Registration Open", message: "TCS National Qualifier Test registration closes on March 5. Register via the TPO portal.", timestamp: "2025-02-25T10:00:00", read: false, actionLabel: "View Details", actionUrl: "/jobs" },
  { id: "n4", type: "update", title: "Resume Generated", message: "Your tailored resume for Flipkart Backend Developer has been generated.", timestamp: "2025-02-24T18:00:00", read: true, actionLabel: "View Resume", actionUrl: "/resume" },
  { id: "n5", type: "match", title: "3 New Matches Found", message: "New opportunities from Telegram and career page scraping match your profile.", timestamp: "2025-02-24T12:00:00", read: true, actionLabel: "View Jobs", actionUrl: "/jobs" },
  { id: "n6", type: "reminder", title: "Interview in 3 days: Google", message: "Technical interview for Software Engineer Intern at Google on March 1.", timestamp: "2025-02-24T09:00:00", read: true, actionLabel: "Open Tracker", actionUrl: "/tracker" },
  { id: "n7", type: "update", title: "Application Status Updated", message: "Your application at Atlassian has been updated to Rejected.", timestamp: "2025-02-23T15:00:00", read: true },
  { id: "n8", type: "announcement", title: "Placement Drive: Infosys", message: "Infosys is conducting a placement drive on March 10. Eligible: all branches, CGPA 7+.", timestamp: "2025-02-23T08:00:00", read: true, actionLabel: "View Details", actionUrl: "/jobs" },
];

export const recentActivity = [
  { id: "ra1", text: "Tailored resume generated for Flipkart", time: "2 hours ago", icon: "file" },
  { id: "ra2", text: "Marked Applied at Microsoft", time: "5 hours ago", icon: "check" },
  { id: "ra3", text: "OA scheduled for Razorpay — Feb 28", time: "1 day ago", icon: "calendar" },
  { id: "ra4", text: "New match: Amazon SDE Intern (91%)", time: "1 day ago", icon: "star" },
  { id: "ra5", text: "Interview scheduled at Google — Mar 1", time: "2 days ago", icon: "video" },
];

export const masterResume = {
  summary: "Final year Computer Science student at IIT Bombay with a strong foundation in algorithms, data structures, and full-stack development. Passionate about building scalable systems and applying machine learning to real-world problems.",
  skills: ["React", "TypeScript", "Node.js", "Python", "Machine Learning", "PostgreSQL", "Docker", "AWS", "Git", "C++", "Java", "Redis"],
  education: [
    { institution: "IIT Bombay", degree: "B.Tech in Computer Science & Engineering", period: "2021 – 2025", grade: "CGPA: 8.72/10" },
    { institution: "Delhi Public School", degree: "Class XII (CBSE)", period: "2019 – 2021", grade: "95.6%" },
  ],
  experience: [
    { company: "PhonePe", role: "Software Engineering Intern", period: "May – Jul 2024", bullets: ["Built real-time payment tracking dashboard using React and Go", "Reduced API latency by 40% through caching layer implementation", "Collaborated with 5-member team using Agile methodology"] },
    { company: "Open Source", role: "Contributor — React Query", period: "Jan – Apr 2024", bullets: ["Fixed 3 bugs in cache invalidation logic", "Improved TypeScript type definitions for mutation hooks"] },
  ],
  projects: [
    { name: "CodeCollab", description: "Real-time collaborative code editor with WebSocket sync", tech: "React, Node.js, WebSocket, Monaco Editor" },
    { name: "MedScan AI", description: "Medical image classification using CNNs with 94% accuracy", tech: "Python, PyTorch, Flask, Docker" },
  ],
  achievements: [
    "Google Kickstart Round H 2024 — Global Rank 342",
    "Smart India Hackathon 2023 — Winner (Software Edition)",
    "ICPC Regionals 2023 — Qualified",
  ],
};

export const upcomingEvents = [
  { id: "e1", title: "Online Assessment — Razorpay", date: "Feb 28, 2025", time: "10:00 AM", company: "Razorpay", type: "OA" },
  { id: "e2", title: "Technical Interview — Google", date: "Mar 1, 2025", time: "2:00 PM", company: "Google", type: "Interview" },
  { id: "e3", title: "Placement Drive — Infosys", date: "Mar 10, 2025", time: "9:00 AM", company: "Infosys", type: "Drive" },
];

export const statusColumns: ApplicationStatus[] = [
  "Saved", "Tailored", "Applied", "OA Scheduled", "Interview Scheduled", "Offer", "Joined", "Rejected", "Withdrawn",
];

export function getSourceBadgeClass(source: JobSource): string {
  switch (source) {
    case "Institute Verified": return "badge-institute";
    case "Career Page": return "badge-scraped";
    case "Telegram": return "badge-telegram";
    case "Extension": return "badge-extension";
    case "Manual": return "badge-manual";
    default: return "badge-scraped";
  }
}

export function getMatchScoreClass(score: number): string {
  if (score >= 80) return "match-score-high";
  if (score >= 60) return "match-score-medium";
  return "match-score-low";
}
