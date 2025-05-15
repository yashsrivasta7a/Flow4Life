import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, X } from 'lucide-react';
import blood from '../assets/blood.png';

const Navbar = ({ user, onLogout, notifications = [], showNotifications, setShowNotifications, menuOpen, setMenuOpen }) => {
  const navigate = useNavigate();
  return (
    <nav className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm shadow-sm border-b border-accent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-3">
            <img src={blood} alt="Flow4Life" className="h-10" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Flow4Life
            </span>
          </Link>
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-primary hover:text-accent transition-colors font-semibold">Dashboard</Link>
            <Link to="/finddonor" className="text-primary hover:text-accent transition-colors font-semibold">Find Donors</Link>
            <Link to="/requestform" className="text-primary hover:text-accent transition-colors font-semibold">Request Blood</Link>
            <Link to="/donate" className="text-primary hover:text-accent transition-colors font-semibold">Become a Donor</Link>
            <Link to="/chats" className="text-primary hover:text-accent transition-colors font-semibold">Messages</Link>
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications && setShowNotifications(!showNotifications)}
                className="p-2 rounded-full hover:bg-background relative border border-accent"
              >
                <Bell className="w-5 h-5 text-accent" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-accent rounded-full text-white text-xs flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>
            {user ? (
              <button
                onClick={onLogout}
                className="bg-primary text-white px-6 py-2 rounded-full hover:bg-accent transition-colors shadow-sm hover:shadow font-semibold"
              >
                Log Out
              </button>
            ) : (
              <Link
                to="/signin"
                className="bg-primary text-white px-6 py-2 rounded-full hover:bg-accent transition-colors shadow-sm hover:shadow font-semibold"
              >
                Log In
              </Link>
            )}
          </div>
          {/* Mobile menu button */}
          <button className="md:hidden" onClick={() => setMenuOpen && setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6 text-primary" /> : <Menu className="w-6 h-6 text-primary" />}
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden px-4 pt-2 pb-3 space-y-1 bg-surface border-t border-accent">
          <Link to="/" className="block px-3 py-2 text-primary hover:bg-background rounded-md font-semibold">Dashboard</Link>
          <Link to="/finddonor" className="block px-3 py-2 text-primary hover:bg-background rounded-md font-semibold">Find Donors</Link>
          <Link to="/requestform" className="block px-3 py-2 text-primary hover:bg-background rounded-md font-semibold">Request Blood</Link>
          <Link to="/donate" className="block px-3 py-2 text-primary hover:bg-background rounded-md font-semibold">Become a Donor</Link>
          <Link to="/chats" className="block px-3 py-2 text-primary hover:bg-background rounded-md font-semibold">Messages</Link>
          {user ? (
            <button
              onClick={onLogout}
              className="w-full text-left px-3 py-2 text-primary hover:bg-background rounded-md font-semibold"
            >
              Log Out
            </button>
          ) : (
            <Link
              to="/signin"
              className="block px-3 py-2 text-primary hover:bg-background rounded-md font-semibold"
            >
              Log In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
