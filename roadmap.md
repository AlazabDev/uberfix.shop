# Roadmap

## مهام مفتوحة
- [ ] نشر دالة `mcp` عبر Supabase CLI (لا يمكن نشرها من هنا لأن الباك-اند خارجي)
- [ ] بناء Operational MCP موثّق (لإرجاع أداة إنشاء الطلب بمصادقة صحيحة)
- [ ] مراجعة مفاتيح API التي لا تملك requests:write (مثل Brand Identity Website) قبل الاعتماد عليها في الإنشاء

## منجز
- [x] إصلاح صلاحية public_submit_rating (التقييم)
- [x] إصلاح دالة بدء الدفع PayTabs
- [x] رسالة تأكيد الموعد للعميل على واتساب + معالجة القرار
- [x] صلاحيات حسب الإجراء + إصلاح idempotency race + alias hvac→ac
- [x] bot.ts: request_id، منع تكرار واتساب، استدعاء داخلي نظيف، إلغاء عبر fn_transition_request_stage
- [x] tool-bridge: create_request، channel=api، latitude/longitude، rating/feedback
- [x] MCP العام للقراءة فقط
