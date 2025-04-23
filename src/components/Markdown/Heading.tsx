import type { ComponentChildren } from "preact";

interface Props {
  children: ComponentChildren;
}
export const Heading = ({ children }: Props) => {
  return <h2 className="text-2xl py-3">{children}</h2>;
};
