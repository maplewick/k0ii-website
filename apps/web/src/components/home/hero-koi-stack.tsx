import Image from "next/image";

import { cn } from "@/lib/utils";

const KOII = [
  {
    src: "/badges/koi-8.png",
    alt: "Titanic Koi",
    rotate: "-rotate-6",
    y: "translate-y-4",
    delay: "0s",
    rise: "0ms",
  },
  {
    src: "/badges/koi-10.png",
    alt: "Rainbow Titanic Koi",
    rotate: "rotate-5",
    y: "-translate-y-5",
    delay: "0.8s",
    rise: "70ms",
  },
  {
    src: "/badges/koi-4.png",
    alt: "Rainbow Huge Koi",
    rotate: "-rotate-3",
    y: "translate-y-2",
    delay: "1.6s",
    rise: "140ms",
  },
  {
    src: "/badges/koi-6.png",
    alt: "Golden Shiny Huge Koi",
    rotate: "rotate-8",
    y: "-translate-y-3",
    delay: "2.4s",
    rise: "210ms",
  },
] as const;

export function HeroKoiStack() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none" aria-hidden>
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_55%_55%,color-mix(in_srgb,var(--koi-orange)_20%,transparent),transparent_68%)] blur-2xl" />
      <div className="relative flex min-h-[10rem] items-end justify-center sm:min-h-[12rem] lg:min-h-[14rem] lg:justify-end">
        {KOII.map((fish, index) => (
          <div
            key={fish.src}
            className={cn(
              "animate-badge-bob group relative",
              index > 0 && "-ml-[clamp(0.75rem,3.2vw,1.5rem)]",
            )}
            style={{ animationDelay: fish.delay, zIndex: index + 1 }}
          >
            <Image
              src={fish.src}
              alt={fish.alt}
              width={160}
              height={160}
              priority={index < 2}
              sizes="(max-width: 640px) 5.5rem, (max-width: 1024px) 7rem, 8.5rem"
              className={cn(
                "animate-fade-rise object-contain",
                "size-[clamp(4.75rem,14vw,8.5rem)]",
                fish.rotate,
                fish.y,
                "drop-shadow-[0_12px_28px_color-mix(in_srgb,var(--pond-teal)_38%,transparent)]",
                "transition-[transform,filter] duration-200 ease-[var(--ease-out)]",
                "[@media(hover:hover)_and_(pointer:fine)]:group-hover:z-10",
                "[@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-2",
                "[@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105",
                "[@media(hover:hover)_and_(pointer:fine)]:group-hover:drop-shadow-[0_18px_36px_color-mix(in_srgb,var(--koi-orange)_32%,transparent)]",
              )}
              style={{ animationDelay: fish.rise }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
