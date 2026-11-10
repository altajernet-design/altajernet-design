import { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

type Props = {
  images: string[];
  index: number;
  alt: string;
  onChange: (index: number) => void;
  onClose: () => void;
};

export function ImageLightbox({ images, index, alt, onChange, onClose }: Props) {
  const touchStartX = useRef<number | null>(null);

  const next = useCallback(() => onChange((index + 1) % images.length), [index, images.length, onChange]);
  const prev = useCallback(() => onChange((index - 1 + images.length) % images.length), [index, images.length, onChange]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      // The page is right-to-left, so the left arrow moves forward.
      if (event.key === 'ArrowLeft') next();
      if (event.key === 'ArrowRight') prev();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [next, prev, onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label="معرض الصور"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const delta = event.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < 50) return;
        if (delta < 0) next();
        else prev();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="إغلاق"
      >
        <X className="h-6 w-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="الصورة السابقة"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="الصورة التالية"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        </>
      )}

      <img src={images[index]} alt={`${alt} - صورة ${index + 1}`} className="max-h-[88vh] max-w-[94vw] object-contain" />
      <div className="absolute bottom-4 rounded-full bg-black/60 px-4 py-1.5 text-sm text-white">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
