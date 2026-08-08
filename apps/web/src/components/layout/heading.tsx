import { cn } from "@/lib/utils";

type HeadingProps = {
  as?: "h1" | "h2" | "h3" | "h4";
  className?: string;
  children: React.ReactNode;
};

export function Heading({ as: Tag = "h2", className, children }: HeadingProps) {
  return (
    <Tag
      className={cn(
        "font-display text-balance tracking-tight text-ink",
        Tag === "h1" && "text-3xl font-bold leading-[1.1] sm:text-4xl lg:text-5xl",
        Tag === "h2" && "text-2xl font-semibold leading-snug sm:text-3xl",
        Tag === "h3" && "text-xl font-semibold leading-snug",
        Tag === "h4" && "text-lg font-medium leading-snug",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
