import type { ComponentChildren } from "preact";

interface Props {
  children: ComponentChildren;
}

export const Heading2Editorial = ({ children }: Props) => {
  return (
    <h2 className="font-display pt-8 pb-3 text-3xl font-semibold">
      {children}
    </h2>
  );
};
