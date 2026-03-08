
import { z } from "zod";

export type DanceStyle = {
  id: string;
  name: string;
  description: string;
};

export type DanceLevel = {
  id: string;
  name: string;
  description: string;
};

export type Coupon = {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  expirationDate?: string; // YYYY-MM-DD
  usageLimit?: number;
  status: 'active' | 'inactive';
  applicableTo: 'all_memberships' | 'specific_memberships' | 'all_classes' | 'specific_classes';
  specificPlanIds: string[];
  specificClassIds: string[];
};

export type PriceTier = {
  classCount: number;
  price: number;
};

// Base schema for all membership plans
export const membershipPlanZodSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string(),
  accessType: z.enum(['time_pass', 'class_pack', 'custom_pack']),
  
  price: z.number().optional(), // Used for time_pass and class_pack
  classCount: z.number().int().optional(), // Used for class_pack
  priceTiers: z.array(z.object({ classCount: z.number(), price: z.number() })).optional(), // Used for custom_pack

  validityType: z.enum(['relative', 'monthly', 'fixed']),
  durationValue: z.number().int().optional(),
  durationUnit: z.enum(['days', 'weeks', 'months']).optional(),
  validityMonths: z.number().int().optional(),
  monthlyStartType: z.enum(['from_purchase', 'next_month']).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  
  features: z.array(z.string()),
  isPopular: z.boolean().optional(),
  visibility: z.enum(['public', 'unlisted']),
  allowedClasses: z.array(z.string()).optional(),
});

export type MembershipPlan = z.infer<typeof membershipPlanZodSchema>;

export type ClassType = 'recurring' | 'one-time' | 'workshop' | 'rental';

export type DanceClass = {
  id: string;
  name: string;
  type: ClassType;
  styleId: string;
  levelId: string;
  teacherIds: number[];
  day: string; // Only for 'recurring'
  time: string; // "HH:MM"
  room: string;
  duration: string; // e.g. '60 min'
  capacity: number;
  enrolledStudentIds: number[];
  cancellationPolicyHours?: number;
  
  date?: string; // "YYYY-MM-DD" for 'one-time', 'workshop', 'rental'
  
  status: 'scheduled' | 'completed' | 'cancelled-low-attendance' | 'cancelled-teacher'; 
  isCancelledAndHidden?: boolean;
  isVisibleToStudents?: boolean;
  rentalContact?: string;
  rentalPrice?: number;
  workshopPaymentType?: 'fixed' | 'percentage';
  workshopPaymentValue?: number;
};

// Represents a specific occurrence of a DanceClass on a given date.
export type ClassInstance = DanceClass & {
  instanceId: string; // Unique ID for this specific instance, e.g., 'clase-1-2024-07-24'
  date: string; // "YYYY-MM-DD" - This is THE date of the instance.
  status: 'completed' | 'scheduled' | 'cancelled-low-attendance' | 'cancelled-teacher';
};


export type AttendanceRecord = {
  classId: string;
  date: string; // YYYY-MM-DD
  status: 'presente' | 'ausente';
};

export const paymentDetailsJsonSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("per_class"), payRate: z.coerce.number().optional().nullable(), cancelledClassPay: z.coerce.number().optional().nullable() }),
  z.object({ type: z.literal("monthly"), monthlySalary: z.coerce.number().optional().nullable(), cancelledClassPay: z.coerce.number().optional().nullable() }),
  z.object({ type: z.literal("percentage"), payRate: z.coerce.number().optional().nullable(), cancelledClassPay: z.coerce.number().optional().nullable() })
]);

export type PaymentDetails = z.infer<typeof paymentDetailsJsonSchema>;


export type User = {
    id: number;
    name: string;
    email: string;
    role: string;
    joined: string;
    avatar: string;
    dob?: string; // YYYY-MM-DD
    mobile?: string;
    isVisibleToStudents?: boolean;
    isPartner?: boolean;
    // Student-specific fields
    attendanceHistory?: AttendanceRecord[];
    // Teacher-specific fields
    bio?: string;
    specialties?: string[];
    paymentDetailsJson?: PaymentDetails;
};

export type Transaction = {
  id: string;
  type: 'ingreso' | 'egreso';
  category: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  receiptUrl?: string;
}

export type StudentMembership = {
  userId: number;
  planId: string;
  startDate: string;
  endDate: string;
  classesRemaining?: number;
}

export type StudentPayment = {
    id: string;
    studentId: number;
    planId: string;
    invoiceDate: string; // YYYY-MM-DD
    totalAmount: number;
    status: 'paid' | 'pending' | 'deposit';
    amountPaid: number;
    amountDue: number;
    notes?: string;
    lastUpdatedBy?: string;
    lastUpdatedDate?: string; // ISO 8601
}


export type Permission = 
  | 'view_dashboard'
  | 'manage_users'
  | 'manage_students'
  | 'manage_classes'
  | 'manage_memberships'
  | 'manage_finances'
  | 'manage_settings'
  | 'manage_roles'
  | 'manage_notes'
  | 'view_teacher_area'
  | 'take_attendance';

export type Role = {
  id: string;
  name: string;
  permissions: Permission[];
};

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';


export type TaskNote = {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    category: string;
    priority?: TaskPriority;
    assigneeIds?: number[];
    createdAt: string; // ISO Date String
    dueDate?: string; // YYYY-MM-DD
    alertDateTime?: string; // ISO Date String
    alertDismissed?: boolean;
};

export type HeroSlide = {
  id?: string;
  heroTitle: string;
  heroSubtitle?: string;
  heroDescription?: string;
  heroButtonText: string;
  heroButtonLink: string;
  heroImageUrl?: string;
};

export type ScheduleImage = {
  id?: string;
  url: string;
  alt?: string;
};

export type AcademySettings = {
  academyName: string;
  contactEmail: string;
  phone?: string;
  whatsappPhone?: string;
  address?: string;
  welcomeMessage?: string;
  enableNewSignups: boolean;
  maintenanceMode: boolean;
  logoUrl?: string;
  faviconUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  openingHours?: string;
  registrationEmailMessage?: string;
  membershipEmailMessage?: string;
  heroSlides: HeroSlide[];
  scheduleImages?: ScheduleImage[];
  
  // About Us Page Content
  aboutUsTitle: string;
  aboutUsStory: string;
  aboutUsMission: string;
  aboutUsVision: string;
  aboutUsValues: string;
  aboutUsTeamTitle: string;
  aboutUsTeamDescription: string;
};

export const SendEmailInputSchema = z.object({
  from: z.string().email().describe("The sender's email address."),
  to: z.string().email().describe("The recipient's email address."),
  subject: z.string().describe("The subject of the email."),
  html: z.string().describe("The HTML content of the email."),
  bcc: z.string().email().optional().describe("The BCC recipient's email address."),
});
export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;
