# Roadmap

## مهام مفتوحة
- [ ] إصلاحات باك-اند (بدون UI/migrations):
  - [ ] maintenance.ts: scopes حسب action، إصلاح idempotency race، alias hvac→ac
  - [ ] bot.ts: request_id، منع تكرار واتساب، headers الاستدعاء الداخلي، حذف acknowledged، منع تغيير المرحلة مباشرة، cancel عبر fn_transition_request_stage
  - [ ] tool-bridge.ts: action=create_request، channel=api مع x-api-key، latitude/longitude، rating/feedback
  - [ ] src/lib/mcp: endpoint عام read-only فقط (إزالة create)
  - [ ] اختبارات + typecheck/lint

## منجز
- [x] إصلاح صلاحية public_submit_rating (التقييم)
- [x] إصلاح دالة بدء الدفع PayTabs (قراءة الفاتورة الصحيحة ورسائل عربية)
- [x] رسالة تأكيد الموعد للعميل على واتساب (موافق/رفض/موعد آخر) + معالجة القرار
