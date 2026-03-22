// src/config/whatsapp.ts
// Centralized WhatsApp configuration - synced with Meta WhatsApp Business Platform

/** 
 * الرقم الرسمي المتزامن مع WhatsApp Business Platform (Meta)
 * هذا هو نفس الرقم المسجل في WHATSAPP_PHONE_NUMBER_ID على المنصة
 */
export const WHATSAPP_BUSINESS_NUMBER = "15557285727";

/** رابط Messenger الرسمي */
export const MESSENGER_LINK = "https://m.me/864375353429675";

/** فتح محادثة واتساب مع رسالة محددة */
export const openWhatsApp = (message: string) => {
  const encodedMessage = encodeURIComponent(message);
  window.open(`https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodedMessage}`, '_blank');
};
