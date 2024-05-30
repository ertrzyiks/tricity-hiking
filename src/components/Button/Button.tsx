import type { ComponentChildren } from "preact";

const classNames = {
  primary:
    "select-none rounded-lg bg-green-500 py-3 px-6 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md shadow-green-900/10 transition-all hover:shadow-lg hover:shadow-green-900/20 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
  neutral:
    "select-none rounded-lg border border-gray-900 py-3 px-6 text-center align-middle font-sans text-xs font-bold uppercase text-gray-900 transition-all hover:opacity-75 focus:ring focus:ring-gray-300 active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
};
export const Button = ({
  children,
  href,
  variant = "primary",
  onClick,
}: {
  children: ComponentChildren;
  href?: string;
  variant?: "primary" | "neutral";
  onClick?: () => void;
}) => {
  if (href) {
    return (
      <a href={href} onClick={onClick} className={classNames[variant]}>
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={classNames[variant]}>
      {children}
    </button>
  );
};
