import type { ComponentChildren } from "preact";

interface Props {
  children: ComponentChildren;
}
export const Heading1 = ({ children }: Props) => {
  return <h1 className="text-2xl py-3 font-semibold">{children}</h1>;
};

export const Heading2 = ({ children }: Props) => {
  return <h2 className="text-xl py-3 font-semibold">{children}</h2>;
};

export const Heading3 = ({ children }: Props) => {
  return <h3 className="text-lg py-2 font-semibold">{children}</h3>;
};
