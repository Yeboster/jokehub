
import type { FC } from 'react';

interface HeaderProps {
  title: string;
}

const Header: FC<HeaderProps> = ({ title }) => {
  return (
    <header className="mb-6 pb-4"> {/* Removed border-b */}
      <h1 className="text-3xl font-bold tracking-tight text-primary">{title}</h1>
    </header>
  );
};

export default Header;
