import type { ComponentChildren } from "preact";

interface Props {
  children: ComponentChildren;
}
export const Paragraph = ({ children }: Props) => {
  return <p className="text-lg py-1">{children}</p>;
};
