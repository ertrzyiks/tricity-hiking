import type { ComponentChildren } from "preact";

interface Props {
  children: ComponentChildren;
}
export const Heading = ({ children }: Props) => {
  return <h1 className="text-2xl py-3">{children}</h1>;
};
