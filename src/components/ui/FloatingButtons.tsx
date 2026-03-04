// src/components/ui/FloatingButtons.tsx
// Dual floating buttons for WhatsApp and Messenger communication

import { useState } from "react";
import { WHATSAPP_BUSINESS_NUMBER, MESSENGER_LINK } from "@/config/whatsapp";

interface FloatingButtonsProps {
  whatsappMessage?: string;
  position?: "left" | "right";
}

export const FloatingButtons = ({ 
  whatsappMessage = "مرحباً، أريد الاستفسار عن خدماتكم 🔧",
  position = "left"
}: FloatingButtonsProps) => {
  const [hoveredButton, setHoveredButton] = useState<"whatsapp" | "messenger" | null>(null);

  const openWhatsApp = () => {
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const openMessenger = () => {
    window.open(MESSENGER_LINK, '_blank');
  };

  return (
    <div 
      className={`fixed bottom-6 ${position === "left" ? "left-6" : "right-6"} z-50 flex flex-col items-center gap-3`}
    >
      {/* Messenger Button */}
      <div className="relative">
        {/* Tooltip */}
        <div 
          className={`
            absolute ${position === "left" ? "right-full mr-3" : "left-full ml-3"} top-1/2 -translate-y-1/2
            bg-white text-gray-800 px-3 py-1.5 rounded-lg shadow-lg text-sm font-medium
            transition-all duration-300 whitespace-nowrap
            ${hoveredButton === "messenger" ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
          `}
        >
          تواصل عبر ماسنجر
        </div>
        
        <button
          onClick={openMessenger}
          onMouseEnter={() => setHoveredButton("messenger")}
          onMouseLeave={() => setHoveredButton(null)}
          className="
            w-14 h-14 rounded-full
            bg-gradient-to-br from-[#0078FF] via-[#00C6FF] to-[#A855F7]
            text-white
            flex items-center justify-center
            shadow-xl hover:shadow-[0_8px_30px_rgba(0,120,255,0.4)]
            transition-all duration-300
            hover:scale-110
          "
          aria-label="تواصل عبر ماسنجر"
        >
          {/* Messenger Icon */}
          <svg 
            viewBox="0 0 24 24" 
            className="w-7 h-7 fill-current"
          >
            <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.906 1.453 5.502 3.729 7.199v3.558l3.442-1.89c.917.254 1.886.39 2.829.39 5.523 0 10-4.145 10-9.257S17.523 2 12 2zm.994 12.469l-2.548-2.719-4.971 2.719 5.467-5.803 2.612 2.72 4.906-2.72-5.466 5.803z"/>
          </svg>
        </button>
      </div>

      {/* WhatsApp Button */}
      <div className="relative">
        {/* Tooltip */}
        <div 
          className={`
            absolute ${position === "left" ? "right-full mr-3" : "left-full ml-3"} top-1/2 -translate-y-1/2
            bg-white text-gray-800 px-3 py-1.5 rounded-lg shadow-lg text-sm font-medium
            transition-all duration-300 whitespace-nowrap
            ${hoveredButton === "whatsapp" ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
          `}
        >
          تواصل عبر واتساب
        </div>

        <button
          onClick={openWhatsApp}
          onMouseEnter={() => setHoveredButton("whatsapp")}
          onMouseLeave={() => setHoveredButton(null)}
          className="
            w-14 h-14 rounded-full
            bg-[#25D366] hover:bg-[#128C7E]
            text-white
            flex items-center justify-center
            shadow-xl hover:shadow-[0_8px_30px_rgba(37,211,102,0.4)]
            transition-all duration-300
            hover:scale-110
          "
          aria-label="تواصل عبر واتساب"
        >
          {/* WhatsApp Icon */}
          <svg 
            viewBox="0 0 24 24" 
            className="w-7 h-7 fill-current"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </button>
        
        {/* Pulse animation ring */}
        <div className="absolute inset-0 w-14 h-14 rounded-full bg-[#25D366] animate-ping opacity-20 pointer-events-none" style={{ animationDuration: '2s' }} />
      </div>
    </div>
  );
};
