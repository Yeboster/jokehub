import type { FC } from 'react';

interface HeaderProps {
  title: string;
}

const Header: FC<HeaderProps> = ({ title }) => {
  return (
    <header className="mb-6 border-b pb-4">
      <h1 className="text-3xl font-bold tracking-tight text-primary">{title}</h1>
    </header>
  );
};

export default Header;
