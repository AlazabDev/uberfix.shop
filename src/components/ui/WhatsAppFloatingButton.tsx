// src/components/ui/WhatsAppFloatingButton.tsx
// Floating WhatsApp button that appears on all pages

import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { WHATSAPP_BUSINESS_NUMBER } from "@/config/whatsapp";

interface WhatsAppFloatingButtonProps {
  message?: string;
  position?: "left" | "right";
}

export const WhatsAppFloatingButton = ({ 
  message = "مرحباً، أريد الاستفسار عن خدماتكم 🔧",
  position = "left"
}: WhatsAppFloatingButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const openWhatsApp = () => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div 
      className={`fixed bottom-6 ${position === "left" ? "left-6" : "right-6"} z-50 flex items-center gap-3`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip */}
      <div 
        className={`
          bg-white text-gray-800 px-4 py-2 rounded-lg shadow-lg text-sm font-medium
          transition-all duration-300 whitespace-nowrap
          ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}
        `}
      >
        تواصل معنا عبر واتساب
      </div>

      {/* Button */}
      <button
        onClick={openWhatsApp}
        className="
          w-14 h-14 rounded-full
          bg-[#25D366] hover:bg-[#128C7E]
          text-white
          flex items-center justify-center
          shadow-2xl hover:shadow-[0_8px_30px_rgb(37,211,102,0.4)]
          transition-all duration-300
          hover:scale-110
          animate-bounce
        "
        style={{ animationDuration: '2s' }}
        aria-label="تواصل عبر واتساب"
      >
        <MessageCircle className="h-7 w-7" />
      </button>

      {/* Pulse animation ring */}
      <div className="absolute inset-0 w-14 h-14 rounded-full bg-[#25D366] animate-ping opacity-20 pointer-events-none" style={{ animationDuration: '2s' }} />
    </div>
  );
};