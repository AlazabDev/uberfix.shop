import { defineMcp } from "@lovable.dev/mcp-js";
import listServices from "./tools/list-services";
import listBranches from "./tools/list-branches";
import findNearestBranch from "./tools/find-nearest-branch";
import trackRequest from "./tools/track-request";
import createRequest from "./tools/create-request";

export default defineMcp({
  name: "uberfix-mcp",
  title: "UberFix",
  version: "0.1.0",
  instructions:
    "أدوات عامة لنظام صيانة UberFix. تصفح الخدمات والفروع، جد أقرب فرع، أنشئ طلب صيانة جديد، أو تتبّع حالة طلب برقمه العام.",
  tools: [listServices, listBranches, findNearestBranch, trackRequest, createRequest],
});