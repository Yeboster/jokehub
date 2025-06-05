
"use client";

import Link from 'next/link';
import { Home, Settings, LogIn, LogOut, UserCircle, Loader2, ListChecks } from 'lucide-react'; // Settings might be 'Manage'
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const pathname = usePathname();
  const { user, loading, signOutUser } = useAuth();

  const navItems = [
    { href: '/', label: 'Home', icon: Home, public: true },
    { href: '/jokes', label: 'Jokes', icon: ListChecks, public: true }, // Changed label from "All Jokes" to "Jokes"
    { href: '/manage', label: 'Manage', icon: Settings, public: false, requiresAuth: true }, // "Manage Jokes" can be "Manage"
  ];

  if (loading) {
    return (
      <nav className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            Joke Hub
          </Link>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-primary">
          Joke Hub
        </Link>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {navItems.map((item) =>
            (item.public || (item.requiresAuth && user)) && (
            <Button
              key={item.href}
              variant={pathname === item.href ? 'secondary' : 'ghost'}
              size="sm"
              asChild
            >
              <Link href={item.href} className="flex items-center">
                <item.icon className="mr-0 h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            </Button>
          ))}

          {user ? (
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center">
                  <UserCircle className="mr-0 h-5 w-5 sm:mr-2" />
                  <span className="hidden sm:inline">{user.email || 'Account'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>{user.email}</DropdownMenuItem>
                <DropdownMenuItem onClick={signOutUser} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            pathname !== '/auth' && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth?redirect=/jokes" className="flex items-center"> {/* Ensure redirect is sensible */}
                  <LogIn className="mr-0 h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Login</span>
                </Link>
              </Button>
            )
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

    