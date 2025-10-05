import type { ComponentChildren } from "preact";

interface Props {
  children: ComponentChildren;
}
export const Mark = ({ children }: Props) => {
  return (
    <mark className="bg-transparent text-purple-600 decoration-purple-600 underline decoration-dotted">
      {children}
    </mark>
  );
};
