type BrandMarkProps = {
  className?: string;
  title?: string;
};

export function BrandMark({
  className = "h-7 w-7",
  title = "Op Shop Locator",
}: BrandMarkProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/mark.svg" alt="" title={title} className={className} />
  );
}
