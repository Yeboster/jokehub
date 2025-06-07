
"use client";

import Link from 'next/link';
import { Home, Settings, LogIn, LogOut, UserCircle, Loader2, ListChecks } from 'lucide-react'; 
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
    { href: '/jokes', label: 'Jokes', icon: ListChecks, public: true },
    { href: '/manage', label: 'Manage', icon: Settings, public: false, requiresAuth: true },
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
        <div className="flex items-center space-x-1 sm:space-x-2">
          {navItems.map((item) =>
            (item.public || (item.requiresAuth && user)) && (
            <Button
              key={item.href}
              variant={pathname === item.href ? 'secondary' : 'ghost'}
              size="sm"
              asChild
              className={cn(
                "flex items-center",
                pathname === item.href ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : "hover:bg-accent/50"
              )}
            >
              <Link href={item.href}>
                <item.icon className="mr-0 h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            </Button>
          ))}

          {user ? (
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center hover:bg-accent/50">
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
              <Button variant="ghost" size="sm" asChild className="hover:bg-accent/50">
                <Link href="/auth?redirect=/jokes" className="flex items-center">
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
