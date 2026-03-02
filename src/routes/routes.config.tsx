import { lazy } from "react";

// Dashboard & Core
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Documentation = lazy(() => import("@/pages/Documentation"));
const MonitoringDashboard = lazy(() => import("@/pages/MonitoringDashboard"));
const BranchManagement = lazy(() => import("@/pages/BranchManagement"));

// Maintenance
const Requests = lazy(() => import("@/pages/maintenance/Requests"));
const RequestDetails = lazy(() => import("@/pages/maintenance/RequestDetails"));
const RequestLifecycleJourney = lazy(
  () => import("@/pages/maintenance/RequestLifecycleJourney")
);
const ServiceRequest = lazy(() => import("@/pages/maintenance/ServiceRequest"));
// ServiceMap is in publicRoutes only
const EmergencyService = lazy(
  () => import("@/pages/maintenance/EmergencyService")
);
const MaintenanceProcedures = lazy(
  () => import("@/pages/maintenance/MaintenanceProcedures")
);
// All Requests page - alias to Requests with different default filter
const AllRequests = lazy(() => import("@/pages/maintenance/Requests"));

// Properties
const Properties = lazy(() => import("@/pages/properties/Properties"));
const AddProperty = lazy(() => import("@/pages/properties/AddProperty"));
const EditProperty = lazy(() => import("@/pages/properties/EditProperty"));
const PropertyDetails = lazy(
  () => import("@/pages/properties/PropertyDetails")
);
const ArchivedProperties = lazy(
  () => import("@/pages/properties/ArchivedProperties")
);

// Reports
const Reports = lazy(() => import("@/pages/reports/Reports"));
const SLADashboard = lazy(() => import("@/pages/reports/SLADashboard"));
const ExpenseReports = lazy(() => import("@/pages/reports/ExpenseReports"));
const MaintenanceReports = lazy(() => import("@/pages/reports/MaintenanceReports"));
const ProductionReport = lazy(() => import("@/pages/reports/ProductionReport"));
const PropertyLifecycle = lazy(() => import("@/pages/reports/PropertyLifecycle"));

// Admin
const UserManagement = lazy(
  () => import("@/pages/admin/UserManagement")
);
const CompanyBranchImport = lazy(
  () => import("@/pages/admin/CompanyBranchImport")
);
const DataImport = lazy(() => import("@/pages/admin/DataImport"));
const StoresDirectory = lazy(() => import("@/pages/admin/StoresDirectory"));
const MaintenanceArchive = lazy(() => import("@/pages/admin/MaintenanceArchive"));
const RateCard = lazy(() => import("@/pages/admin/RateCard"));
const MallsDirectory = lazy(() => import("@/pages/admin/MallsDirectory"));

// Technicians
// TechnicianRegistration is in publicRoutes
const TechnicianVerification = lazy(
  () => import("@/pages/technicians/TechnicianVerification")
);
const TechnicianAgreement = lazy(
  () => import("@/pages/technicians/TechnicianAgreement")
);
const TechnicianTraining = lazy(
  () => import("@/pages/technicians/TechnicianTraining")
);
const TechnicianDashboard = lazy(
  () => import("@/pages/technicians/TechnicianDashboard")
);
const TechnicianTaskManagement = lazy(
  () => import("@/pages/technicians/TechnicianTaskManagement")
);
const TechnicianWallet = lazy(
  () => import("@/pages/technicians/TechnicianWallet")
);
const TechnicianWithdrawal = lazy(
  () => import("@/pages/technicians/TechnicianWithdrawal")
);
const TechnicianEarnings = lazy(
  () => import("@/pages/technicians/TechnicianEarnings")
);
const HallOfExcellence = lazy(
  () => import("@/pages/technicians/HallOfExcellence")
);
const AdminControlCenter = lazy(
  () => import("@/pages/admin/AdminControlCenter")
);
const ProductionMonitor = lazy(
  () => import("@/pages/admin/ProductionMonitor")
);
const Testing = lazy(() => import("@/pages/admin/Testing"));
const TechnicianApprovalQueue = lazy(
  () => import("@/pages/admin/TechnicianApprovalQueue")
);

// Messages
const Inbox = lazy(() => import("@/pages/messages/ChatPage"));
const WhatsAppMessages = lazy(
  () => import("@/pages/messages/WhatsAppMessages")
);
const MessageLogs = lazy(
  () => import("@/pages/messages/MessageLogs")
);
const WhatsAppTemplatesPage = lazy(
  () => import("@/pages/whatsapp/WhatsAppTemplatesPage")
);
const WhatsAppMessageLogsPage = lazy(
  () => import("@/pages/whatsapp/WhatsAppMessageLogsPage")
);
const WhatsAppMaintenanceFormPage = lazy(
  () => import("@/pages/whatsapp/WhatsAppMaintenanceFormPage")
);
const NotificationCenterPage = lazy(
  () => import("@/pages/notifications/NotificationCenterPage")
);

// Projects
const ProjectDetails = lazy(() => import("@/pages/projects/ProjectDetails"));

// Settings
const Settings = lazy(() => import("@/pages/settings/Settings"));

// Vendors
const Vendors = lazy(() => import("@/pages/Vendors"));
const VendorDetails = lazy(() => import("@/pages/VendorDetails"));

// Other
const Appointments = lazy(() => import("@/pages/Appointments"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));

// Module Settings (Owner only)
const ModuleSettings = lazy(() => import("@/pages/admin/ModuleSettings"));

// Maintenance Module Pages
const CreateMaintenanceRequest = lazy(() => import("@/pages/maintenance/CreateMaintenanceRequest"));
const MaintenanceOverview = lazy(() => import("@/pages/maintenance/MaintenanceOverview"));

// Contracts
const ContractsList = lazy(() => import("@/pages/contracts/ContractsList"));
const ContractDetails = lazy(() => import("@/pages/contracts/ContractDetails"));

export const protectedRoutes = [
  { path: "/dashboard", element: <Dashboard />, withLayout: true },
  { path: "/monitoring", element: <MonitoringDashboard />, withLayout: true },
  { path: "/branch-management", element: <BranchManagement />, withLayout: true },

  // Maintenance
  { path: "/requests", element: <Requests />, withLayout: true },
  { path: "/requests/:id", element: <RequestDetails />, withLayout: true },
  { path: "/all-requests", element: <AllRequests />, withLayout: true },
  { path: "/request-lifecycle", element: <RequestLifecycleJourney />, withLayout: true },
  { path: "/service-request", element: <ServiceRequest />, withLayout: true },
  { path: "/maintenance/overview", element: <MaintenanceOverview />, withLayout: true },
  { path: "/maintenance/create", element: <CreateMaintenanceRequest />, withLayout: true },
  { path: "/maintenance/:id", element: <RequestDetails />, withLayout: true },

  // Contracts
  { path: "/contracts", element: <ContractsList />, withLayout: true },
  { path: "/contracts/:id", element: <ContractDetails />, withLayout: true },

  // Vendors
  { path: "/vendors", element: <Vendors />, withLayout: true },
  { path: "/vendors/:id", element: <VendorDetails />, withLayout: true },

  // Reports
  { path: "/reports", element: <Reports />, withLayout: true },
  { path: "/reports/sla", element: <SLADashboard />, withLayout: true },
  { path: "/reports/expenses", element: <ExpenseReports />, withLayout: true },
  { path: "/reports/maintenance", element: <MaintenanceReports />, withLayout: true },
  { path: "/reports/production", element: <ProductionReport />, withLayout: true },
  { path: "/reports/property-lifecycle", element: <PropertyLifecycle />, withLayout: true },

  // Properties
  { path: "/properties", element: <Properties />, withLayout: true },
  { path: "/properties/add", element: <AddProperty />, withLayout: true },
  { path: "/properties/archived", element: <ArchivedProperties />, withLayout: true },
  { path: "/properties/:id", element: <PropertyDetails />, withLayout: true },
  { path: "/properties/edit/:id", element: <EditProperty />, withLayout: true },

  // Other
  { path: "/appointments", element: <Appointments />, withLayout: true },
  { path: "/invoices", element: <Invoices />, withLayout: true },
  { path: "/documentation", element: <Documentation />, withLayout: true },
  { path: "/maintenance-procedures", element: <MaintenanceProcedures />, withLayout: true },
  { path: "/settings", element: <Settings />, withLayout: true },
  { path: "/testing", element: <Testing />, withLayout: true },
  { path: "/production-monitor", element: <ProductionMonitor />, withLayout: true },
  { path: "/projects/:id", element: <ProjectDetails />, withLayout: true },
  { path: "/admin/users", element: <UserManagement />, withLayout: true },
  { path: "/admin/company-branch-import", element: <CompanyBranchImport />, withLayout: true },
  { path: "/admin/data-import", element: <DataImport />, withLayout: true },
  { path: "/admin/stores", element: <StoresDirectory />, withLayout: true },
  { path: "/admin/maintenance-archive", element: <MaintenanceArchive />, withLayout: true },
  { path: "/admin/rate-card", element: <RateCard />, withLayout: true },
  { path: "/admin/malls", element: <MallsDirectory />, withLayout: true },
  { path: "/admin/technician-approval", element: <TechnicianApprovalQueue />, withLayout: true },
  { path: "/admin/module-settings", element: <ModuleSettings />, withLayout: true },
  { path: "/users", element: <UsersPage />, withLayout: true },
  { path: "/admin-control-center", element: <AdminControlCenter />, withLayout: true },

  // Technicians Module (register is public - see publicRoutes)
  { path: "/technicians/verification", element: <TechnicianVerification />, withLayout: true },
  { path: "/technicians/agreement", element: <TechnicianAgreement />, withLayout: true },
  { path: "/technicians/training", element: <TechnicianTraining />, withLayout: true },
  { path: "/technicians/dashboard", element: <TechnicianDashboard />, withLayout: true },
  { path: "/technicians/tasks", element: <TechnicianTaskManagement />, withLayout: true },
  { path: "/technicians/wallet", element: <TechnicianWallet />, withLayout: true },
  { path: "/technicians/withdrawal", element: <TechnicianWithdrawal />, withLayout: true },
  { path: "/technicians/earnings", element: <TechnicianEarnings />, withLayout: true },
  { path: "/hall-of-excellence", element: <HallOfExcellence />, withLayout: true },

  // Messages & Notifications
  { path: "/dashboard/notification-center", element: <NotificationCenterPage />, withLayout: true },
  { path: "/whatsapp", element: <WhatsAppMessages />, withLayout: true },
  { path: "/whatsapp/maintenance-form", element: <WhatsAppMaintenanceFormPage />, withLayout: true },
  { path: "/message-logs", element: <MessageLogs />, withLayout: true },
  { path: "/dashboard/whatsapp/templates", element: <WhatsAppTemplatesPage />, withLayout: true },
  { path: "/dashboard/whatsapp/logs", element: <WhatsAppMessageLogsPage />, withLayout: true },

  // No layout (service-map is public - see publicRoutes)
  { path: "/emergency-service/:technicianId", element: <EmergencyService />, withLayout: false },
  { path: "/inbox", element: <Inbox />, withLayout: true }
];
