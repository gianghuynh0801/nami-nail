'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { User, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-white/90 backdrop-blur-md shadow-sm border-b border-beige-dark/30 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image 
              src="/images/logo.webp" 
              alt="NAMI Nail" 
              width={140} 
              height={50}
              className="h-12 w-auto object-contain"
              priority
            />
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-gray-700 hover:text-primary-400 transition-colors font-medium"
                >
                  Dashboard
                </Link>
                <div className="flex items-center gap-3 px-4 py-2 bg-beige-light rounded-full border border-beige-dark/20">
                  <User className="w-4 h-4 text-primary-500" />
                  <span className="text-sm text-gray-700 font-medium">
                    {session.user?.name}
                  </span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex items-center gap-2 px-6 py-3 bg-primary-400 text-white rounded-full hover:bg-primary-500 transition-all hover:shadow-lg hover:shadow-primary-400/30 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-gray-700 hover:text-primary-400 transition-colors font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="px-6 py-3 bg-primary-400 text-white rounded-full hover:bg-primary-500 transition-all hover:shadow-lg hover:shadow-primary-400/30 font-medium"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-700 hover:text-primary-400 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-beige-dark/30 animate-fade-in">
            {session ? (
              <div className="flex flex-col gap-3">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-gray-700 hover:text-primary-400 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="w-4 h-4" />
                  {session.user?.name}
                </div>
                <button
                  onClick={() => {
                    signOut({ callbackUrl: '/' })
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center gap-2 text-left text-gray-700 hover:text-primary-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  href="/auth/login"
                  className="text-gray-700 hover:text-primary-400 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="px-6 py-2 bg-primary-400 text-white rounded-full hover:bg-primary-500 transition-colors text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

