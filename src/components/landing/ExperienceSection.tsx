import { useEffect, useRef } from 'react';

export const ExperienceSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const teamImages = [
    '/img/team001.jpg', '/img/team002.jpg', '/img/team003.jpg', '/img/team004.jpg',
    '/img/team005.jpg', '/img/team006.jpg', '/img/team007.jpg', '/img/team008.jpg',
  ];

  const doubledImages = [...teamImages, ...teamImages, ...teamImages];

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let scrollPosition = 0;
    const scrollSpeed = 0.4;

    const animate = () => {
      scrollPosition += scrollSpeed;
      if (scrollPosition >= scrollContainer.scrollWidth / 3) scrollPosition = 0;
      scrollContainer.scrollLeft = scrollPosition;
      requestAnimationFrame(animate);
    };

    const animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <section className="py-16 bg-accent/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2 text-foreground">اختبر اللحظة</h2>
          <p className="text-base text-muted-foreground">
            اغمر نفسك في أحدث الاتجاهات وما وراء الكواليس
          </p>
        </div>

        {/* Team photos carousel */}
        <div className="relative overflow-hidden rounded-2xl bg-card py-6">
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-card to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-card to-transparent z-10" />
          
          <div ref={scrollRef} className="flex gap-5 overflow-x-hidden" style={{ scrollBehavior: 'auto' }}>
            {doubledImages.map((image, index) => (
              <div key={index} className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32">
                <div className="w-full h-full rounded-full border-2 border-border p-0.5 hover:border-primary/40 transition-colors">
                  <img
                    src={image}
                    alt={`فريق العمل ${(index % teamImages.length) + 1}`}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GIF */}
        <div className="mt-8 max-w-3xl mx-auto">
          <div className="w-full rounded-xl overflow-hidden">
            <img 
              src="https://al-azab.co/img/uberfix/uber-hero.gif" 
              alt="UberFix Network Animation"
              className="w-full h-auto object-contain"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
