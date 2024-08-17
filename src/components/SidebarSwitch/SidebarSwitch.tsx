import { useState, useEffect } from "preact/hooks";
import type { ComponentChildren } from "preact";

const SidebarSwitch = ({
  className,
  children,
}: {
  className: string;
  children: ComponentChildren;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const sidebar = document.getElementById("sidebar");

    if (!sidebar) {
      return;
    }

    if (isOpen) {
      sidebar.classList.remove("sidebar");
      sidebar.classList.add("sidebar--open");
    } else {
      sidebar.classList.add("sidebar");
      sidebar.classList.remove("sidebar--open");
    }

    return () => {
      sidebar.classList.add("sidebar");
      sidebar.classList.remove("sidebar--open");
    };
  }, [isOpen]);

  return (
    <button className={className} onClick={() => setIsOpen(!isOpen)}>
      {children}
    </button>
  );
};

export default SidebarSwitch;
