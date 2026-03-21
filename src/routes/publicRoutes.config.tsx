import { lazy } from "react";
import { Navigate } from "react-router-dom";

// Auth pages
const Index = lazy(() => import("@/pages/public/Index"));
const RoleSelection = lazy(() => import("@/pages/auth/RoleSelection"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const AuthCallback = lazy(() => import("@/pages/auth/AuthCallback"));
const UpdatePassword = lazy(() => import("@/pages/auth/UpdatePassword"));
const VerifyEmailChange = lazy(() => import("@/pages/auth/VerifyEmailChange"));
const Reauth = lazy(() => import("@/pages/auth/Reauth"));
const MagicLink = lazy(() => import("@/pages/auth/MagicLink"));

// Public pages
const About = lazy(() => import("@/pages/public/About"));
const PrivacyPolicy = lazy(() => import("@/pages/public/PrivacyPolicy"));
const PrivacyPolicyEnglish = lazy(() => import("@/pages/public/PrivacyPolicyEnglish"));
const TermsOfService = lazy(() => import("@/pages/public/TermsOfService"));
const TermsEnglish = lazy(() => import("@/pages/public/TermsEnglish"));
const AcceptableUsePolicy = lazy(() => import("@/pages/public/AcceptableUsePolicy"));
const AuthDocumentation = lazy(() => import("@/pages/public/AuthDocumentation"));
const APIDocumentation = lazy(() => import("@/pages/public/APIDocumentation"));
const ComplianceStatements = lazy(() => import("@/pages/public/ComplianceStatements"));
const DataDeletion = lazy(() => import("@/pages/public/DataDeletion"));
const Services = lazy(() => import("@/pages/public/Services"));
const Gallery = lazy(() => import("@/pages/public/Gallery"));
const Blog = lazy(() => import("@/pages/public/Blog"));
const BlogPost = lazy(() => import("@/pages/public/BlogPost"));
const FAQ = lazy(() => import("@/pages/public/FAQ"));
const UserGuide = lazy(() => import("@/pages/public/UserGuide"));
const BookConsultation = lazy(() => import("@/pages/public/BookConsultation"));
const ServiceRequest = lazy(() => import("@/pages/public/ServiceRequest"));

// Other public pages
const Projects = lazy(() => import("@/pages/projects/Projects"));
const PWASettings = lazy(() => import("@/pages/settings/PWASettings"));
const QuickRequest = lazy(() => import("@/pages/QuickRequest"));
const PublicQuickRequest = lazy(() => import("@/pages/PublicQuickRequest"));
const QuickRequestFromMap = lazy(() => import("@/pages/QuickRequestFromMap"));
const TrackOrders = lazy(() => import("@/pages/TrackOrders"));
const TrackOrder = lazy(() => import("@/pages/track/TrackOrder"));
const CompletedServices = lazy(() => import("@/pages/CompletedServices"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const WhatsAppStatusPage = lazy(() => import("@/pages/messages/WhatsAppStatusPage"));
const ServiceMap = lazy(() => import("@/pages/maintenance/ServiceMap"));
const ChatPage = lazy(() => import("@/pages/messages/ChatPage"));
const PublicMaintenanceForm = lazy(() => import("@/pages/whatsapp/WhatsAppMaintenanceFormPage"));
const UberFixRequestForm = lazy(() => import("@/pages/public/UberFixRequestForm"));

// Technician pages
const TechnicianRegistration = lazy(() => import("@/pages/technicians/TechnicianRegistration"));
const TechnicianRegistrationWizard = lazy(() => import("@/pages/technicians/TechnicianRegistrationWizard"));
const RegistrationThankYou = lazy(() => import("@/pages/technicians/RegistrationThankYou"));

/**
 * المسارات العامة (لا تتطلب تسجيل دخول)
 */
export const publicRoutes = [
  { path: "/", element: <Index /> },
  { path: "/role-selection", element: <RoleSelection /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/auth/callback", element: <AuthCallback /> },
  { path: "/auth/update-password", element: <UpdatePassword /> },
  { path: "/auth/verify-email-change", element: <VerifyEmailChange /> },
  { path: "/auth/reauth", element: <Reauth /> },
  { path: "/auth/magic", element: <MagicLink /> },
  { path: "/about", element: <About /> },
  { path: "/privacy-policy", element: <PrivacyPolicy /> },
  { path: "/privacy", element: <PrivacyPolicy /> },
  { path: "/privacy-policy-english", element: <PrivacyPolicyEnglish /> },
  { path: "/terms-of-service", element: <TermsOfService /> },
  { path: "/terms", element: <TermsOfService /> },
  { path: "/terms-english", element: <TermsEnglish /> },
  { path: "/data-deletion", element: <DataDeletion /> },
  { path: "/compliance", element: <ComplianceStatements /> },
  { path: "/acceptable-use-policy", element: <AcceptableUsePolicy /> },
  { path: "/api-documentation", element: <APIDocumentation /> },
  { path: "/auth-documentation", element: <AuthDocumentation /> },
  { path: "/services", element: <Services /> },
  { path: "/service-request", element: <ServiceRequest /> },
  { path: "/gallery", element: <Gallery /> },
  { path: "/faq", element: <FAQ /> },
  { path: "/user-guide", element: <UserGuide /> },
  { path: "/book-consultation", element: <BookConsultation /> },
  { path: "/projects", element: <Projects /> },
  { path: "/blog", element: <Blog /> },
  { path: "/blog/:slug", element: <BlogPost /> },
  { path: "/pwa-settings", element: <PWASettings /> },
  { path: "/quick-request/:propertyId", element: <QuickRequest /> },
  { path: "/qr/:propertyId", element: <PublicQuickRequest /> },
  { path: "/quick-request", element: <Navigate to="/uf" replace /> },
  { path: "/quick-request-from-map", element: <QuickRequestFromMap /> },
  { path: "/track-orders", element: <TrackOrders /> },
  { path: "/track", element: <TrackOrder /> },
  { path: "/track/:orderId", element: <TrackOrder /> },
  { path: "/completed-services", element: <CompletedServices /> },
  { path: "/whatsapp-status", element: <WhatsAppStatusPage /> },
  { path: "/service-map", element: <ServiceMap /> },
  { path: "/chat", element: <ChatPage /> },
  { path: "/maintenance-request", element: <PublicMaintenanceForm /> },
  { path: "/uf", element: <UberFixRequestForm /> },
  { path: "/technicians/register", element: <TechnicianRegistration /> },
  { path: "/technicians/registration/wizard", element: <TechnicianRegistrationWizard /> },
  { path: "/technicians/registration/thank-you", element: <RegistrationThankYou /> },
  { path: "*", element: <NotFound /> },
];
