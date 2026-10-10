"use client";

import { useMe } from "@/hooks/useAuth";
import { GithubIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function TopNavBar() {
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: user } = useMe();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={`w-full fixed top-0 z-50 transition-all duration-300 ${
        isScrolled ? "shadow-sm border-b border-outline-variant/30" : ""
      }`}
      style={{
        backgroundColor: isScrolled ? "rgba(2, 4, 3, 1)" : "transparent",
      }}
    >
      <nav className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-md max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 transition-colors duration-300">
          <span className="text-xl font-headline-md font-bold tracking-tight text-white">
            Sendliberty
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-xl">
          <Link
            href="#features"
            className="font-body-md text-body-md text-white/80 hover:text-white transition-colors duration-300"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="font-body-md text-body-md text-white/80 hover:text-white transition-colors duration-300"
          >
            How It Works
          </Link>
          <Link
            href="#pricing"
            className="font-body-md text-body-md text-white/80 hover:text-white transition-colors duration-300"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="font-body-md text-body-md text-white/80 hover:text-white transition-colors duration-300"
          >
            Docs
          </Link>
          <a
            href="mailto:hello@samueltuoyo.com"
            className="font-body-md text-body-md text-white/80 hover:text-white transition-colors duration-300"
          >
            Contact
          </a>
          <a
            href="https://github.com/samueltuoyo15/sendliberty"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-body-md text-body-md text-white/80 hover:text-white transition-colors duration-300"
          >
            <HugeiconsIcon icon={GithubIcon} size={16} />
            GitHub
          </a>
        </div>
        <div className="flex items-center gap-md">
          <a
            href="https://github.com/samueltuoyo15/sendliberty"
            target="_blank"
            rel="noopener noreferrer"
            className="md:hidden flex items-center p-2 text-white/80 hover:text-white transition-colors"
            aria-label="GitHub Repository"
          >
            <HugeiconsIcon icon={GithubIcon} size={20} />
          </a>
          {mounted && user ? (
            <Link
              href="/dashboard"
              className="px-lg py-sm rounded-xl font-label-sm text-label-sm transition-all duration-300 active:scale-95 inline-block bg-white text-black hover:bg-white/90 font-bold"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:block font-label-sm text-label-sm transition-all duration-300 active:scale-95 px-lg py-sm text-white/80 hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/login"
                className="px-lg py-sm rounded-xl font-label-sm text-label-sm transition-all duration-300 active:scale-95 inline-block bg-white text-black hover:bg-white/90 font-bold"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
