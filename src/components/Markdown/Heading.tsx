import type { ComponentChildren } from "preact";

interface Props {
  children: ComponentChildren;
}
export const Heading = ({ children }: Props) => {
  return <h1 className="text-4xl py-6">{children}</h1>;
};
