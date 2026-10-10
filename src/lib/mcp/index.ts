import { auth, defineMcp } from "@lovable.dev/mcp-js";
import createRequest from "./tools/create-request";
import checkRequestStatus from "./tools/check-request-status";
import getRequestDetails from "./tools/get-request-details";
import addRequestNote from "./tools/add-request-note";
import cancelRequest from "./tools/cancel-request";
import getQuote from "./tools/get-quote";
import listServices from "./tools/list-services";
import listCategories from "./tools/list-categories";
import listBranches from "./tools/list-branches";
import findNearestBranch from "./tools/find-nearest-branch";

// Vite inlines the stable ref; the issuer must be the direct supabase.co host.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

/**
 * UberFix Universal AI Connector — خادم MCP واحد لأي وكيل متوافق.
 * المستخدم يفوّض الوكيل عبر OAuth 2.1 + PKCE، وكل أداة تعمل بتوكنه هو
 * فتطبَّق RLS وعزل الشركة والفرع ودورة العمل كما في التطبيق تمامًا.
 */
export default defineMcp({
  name: "uberfix",
  title: "UberFix",
  version: "1.0.0",
  instructions:
    "أدوات نظام صيانة UberFix باسم المستخدم المسجّل: تسجيل طلب صيانة أو عرض سعر، متابعة الطلبات وتفاصيلها، إضافة ملاحظة، إلغاء طلب، وتصفح الخدمات والتصنيفات والفروع. اطلب تأكيد المستخدم قبل أي إنشاء أو إلغاء، ولا تخترع أرقام طلبات.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    createRequest,
    checkRequestStatus,
    getRequestDetails,
    addRequestNote,
    cancelRequest,
    getQuote,
    listServices,
    listCategories,
    listBranches,
    findNearestBranch,
  ],
});
