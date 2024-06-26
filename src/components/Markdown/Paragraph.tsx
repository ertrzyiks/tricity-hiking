import type { ComponentChildren } from "preact";

interface Props {
  children: ComponentChildren;
}
export const Paragraph = ({ children }: Props) => {
  return <p className="text-base py-1">{children}</p>;
};
