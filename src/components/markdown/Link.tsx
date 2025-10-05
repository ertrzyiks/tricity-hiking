import type { ComponentChildren } from "preact";

interface Props {
  href: string;
  children: ComponentChildren;
}
export const Link = ({ href, children }: Props) => {
  return (
    <a href={href} className="text-blue-600">
      {children}
    </a>
  );
};
