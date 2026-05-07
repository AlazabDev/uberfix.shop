import bannerImg from '@/assets/uberfix-banner.jpg';
import stampImg from '@/assets/uberfix-stamp.png';

/**
 * Centralized UberFix document branding.
 * Used by every PDF/HTML export & exposed assets for emails.
 */
export const BRAND = {
  navy: '#030957',
  gold: '#FFB900',
  navyDark: '#020640',
  goldSoft: '#FFE08A',
  publicBannerUrl: 'https://uberfix.shop/branding/uberfix-banner.jpg',
  publicStampUrl: 'https://uberfix.shop/branding/uberfix-stamp.png',
  bannerAsset: bannerImg,
  stampAsset: stampImg,
  phone: '+1 555 728 5727',
  email: 'support@uberfix.shop',
  website: 'uberfix.shop',
};

/**
 * Returns the HTML header used inside any html2canvas-based PDF.
 * Navy background + diagonal Gold accent, identical to DocumentTemplate.
 */
export function brandedHeaderHtml(opts: {
  documentType: string;
  documentTypeLatin?: string;
  documentId?: string;
  documentDate?: string;
}) {
  const { documentType, documentTypeLatin = '', documentId = '', documentDate = '' } = opts;
  return `
    <div style="position:relative; background:${BRAND.navy}; color:#fff; padding:0; overflow:hidden; border-radius:8px 8px 0 0;">
      <div style="position:absolute;top:0;right:0;width:38%;height:100%;background:${BRAND.gold};clip-path:polygon(20% 0,100% 0,100% 100%,0% 100%);"></div>
      <div style="position:absolute;top:0;right:0;width:32%;height:100%;background:${BRAND.navy};clip-path:polygon(25% 0,100% 0,100% 100%,0% 100%);"></div>
      <div style="position:relative;display:flex;justify-content:space-between;align-items:flex-start;padding:22px 30px;">
        <div>
          <div style="font-size:26px;font-weight:900;letter-spacing:-.5px;line-height:1;">
            <span style="color:#fff;">Uber</span><span style="color:${BRAND.gold};">Fix</span><span style="font-size:14px;font-weight:300;color:rgba(255,255,255,.8);">.shop</span>
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:4px;letter-spacing:1px;">Smart Maintenance Platform</div>
        </div>
        <div style="text-align:left;z-index:10;">
          <div style="font-size:24px;font-weight:900;color:#fff;text-transform:uppercase;">${documentType}</div>
          ${documentTypeLatin ? `<div style="font-size:10px;letter-spacing:3px;color:rgba(255,255,255,.85);text-transform:uppercase;margin-top:2px;">${documentTypeLatin}</div>` : ''}
          ${documentId ? `<div style="font-size:11px;color:rgba(255,255,255,.9);margin-top:8px;font-family:monospace;">ID: <strong>${documentId}</strong></div>` : ''}
          ${documentDate ? `<div style="font-size:11px;color:rgba(255,255,255,.8);margin-top:2px;">${documentDate}</div>` : ''}
        </div>
      </div>
      <div style="height:5px;background:linear-gradient(90deg,transparent,${BRAND.gold} 30%,${BRAND.gold} 70%,transparent);"></div>
    </div>
  `;
}

/**
 * Branded footer with mirrored diagonal Gold accent.
 */
export function brandedFooterHtml() {
  return `
    <div style="position:relative;background:${BRAND.navy};color:#fff;overflow:hidden;border-radius:0 0 8px 8px;margin-top:18px;">
      <div style="position:absolute;bottom:0;left:0;width:38%;height:100%;background:${BRAND.gold};clip-path:polygon(0 0,80% 0,100% 100%,0 100%);"></div>
      <div style="position:absolute;bottom:0;left:0;width:32%;height:100%;background:${BRAND.navy};clip-path:polygon(0 0,75% 0,100% 100%,0 100%);"></div>
      <div style="position:relative;display:flex;justify-content:space-between;align-items:center;padding:14px 30px;font-size:11px;">
        <span style="opacity:.95;">© ${new Date().getFullYear()} UberFix.shop — جميع الحقوق محفوظة</span>
        <span style="opacity:.95;font-family:monospace;">${BRAND.website} · ${BRAND.phone}</span>
      </div>
    </div>
  `;
}

/** Stamp + QR row for inside-PDF exports (uses bundled asset url). */
export function brandedStampHtml(verifyUrl?: string) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:24px;padding:0 4px;">
      <div style="text-align:center;">
        ${verifyUrl ? `<img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(verifyUrl)}" width="72" height="72" alt="QR" style="border:1px solid #eee;padding:4px;background:#fff;border-radius:4px;" />
        <div style="font-size:9px;color:#888;margin-top:4px;">تحقّق من المستند</div>` : ''}
      </div>
      <div style="text-align:center;">
        <img src="${BRAND.publicStampUrl}" width="84" height="84" alt="Stamp" style="opacity:.9;transform:rotate(-8deg);" />
        <div style="font-size:9px;color:#888;margin-top:2px;">الختم الرسمي · UberFix</div>
      </div>
    </div>
  `;
}