// Options shared by the API (validation) and the client (forms, labels).

export const JOB_FAMILIES = [
  'Software Engineer',
  'Embedded Software Engineer',
  'Systems Engineer',
  'Electrical Engineer',
  'Hardware / FPGA Engineer',
  'RF / Antenna Engineer',
  'Mechanical Engineer',
  'Aerospace Engineer',
  'Test Engineer',
  'Cybersecurity Engineer',
  'Data Scientist / ML',
  'Modeling & Simulation Engineer',
  'Manufacturing Engineer',
  'Quality / Reliability Engineer',
  'Program Manager',
  'Project Manager',
  'Product Manager',
  'Business / Financial Analyst',
  'Logistics / Supply Chain',
  'IT / Network Engineer',
  'Engineering Technician',
  'Contracts / Procurement',
  'Other',
];

export const LEVELS = [
  { value: 'L1', label: 'Entry', long: 'Entry level (I) · 0-2 yrs' },
  { value: 'L2', label: 'Mid', long: 'Mid level (II) · 2-5 yrs' },
  { value: 'L3', label: 'Senior', long: 'Senior (III) · 5-9 yrs' },
  { value: 'L4', label: 'Lead / Staff', long: 'Lead / Staff (IV) · 9-14 yrs' },
  { value: 'L5', label: 'Principal', long: 'Principal (V) · 14+ yrs' },
  { value: 'L6', label: 'Fellow', long: 'Fellow / Distinguished' },
];

export const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'intern', label: 'Internship' },
  { value: 'co_op', label: 'Co-op' },
  { value: 'part_time', label: 'Part-time' },
];

// Intern-like types are paid hourly and get the "did they sponsor your clearance" question.
export const HOURLY_TYPES = new Set(['intern', 'co_op', 'part_time']);

export const CLEARANCE_LEVELS = ['Public Trust', 'Secret', 'Top Secret', 'TS/SCI', 'TS/SCI + Poly'];

export const SPONSORSHIP = [
  { value: 'yes', label: 'Yes, the company sponsored it' },
  { value: 'had', label: 'No, I already had one' },
  { value: 'no', label: 'No, I had to have it to be hired' },
];

export const INTERN_SPONSORSHIP = [
  { value: 'yes', label: 'Yes, they sponsored a clearance' },
  { value: 'no', label: 'No clearance sponsorship' },
];

export const WORK_ARRANGEMENTS = [
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
];

export const EDUCATION = [
  { value: 'high_school', label: 'High school' },
  { value: 'associates', label: "Associate's" },
  { value: 'bachelors', label: "Bachelor's" },
  { value: 'masters', label: "Master's" },
  { value: 'phd', label: 'PhD' },
];

export const LOCATIONS = ['Redstone Arsenal', 'Cummings Research Park', 'Other Huntsville'];

export const levelLabel = (v) => LEVELS.find((l) => l.value === v)?.label ?? v;
export const typeLabel = (v) => EMPLOYMENT_TYPES.find((t) => t.value === v)?.label ?? v;
export const arrangementLabel = (v) => WORK_ARRANGEMENTS.find((t) => t.value === v)?.label ?? v;

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
