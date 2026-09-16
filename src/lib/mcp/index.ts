import { defineMcp } from "@lovable.dev/mcp-js";
import listServices from "./tools/list-services";
import listBranches from "./tools/list-branches";
import findNearestBranch from "./tools/find-nearest-branch";
import trackRequest from "./tools/track-request";

/**
 * خادم MCP العام — للقراءة فقط.
 * إنشاء الطلبات وأي عملية تغيير تحتاج مصادقة موثّقة، وستُقدَّم عبر
 * Operational MCP منفصل في خطوة لاحقة، لذلك أُزيلت أداة الإنشاء من هنا.
 */
export default defineMcp({
  name: "uberfix-mcp",
  title: "UberFix (read-only)",
  version: "0.2.0",
  instructions:
    "أدوات عامة للقراءة فقط في نظام صيانة UberFix: تصفح الخدمات والفروع، جد أقرب فرع، أو تتبّع حالة طلب برقمه العام. لا يمكن إنشاء أو تعديل الطلبات من هذا الخادم العام.",
  tools: [listServices, listBranches, findNearestBranch, trackRequest],
});
