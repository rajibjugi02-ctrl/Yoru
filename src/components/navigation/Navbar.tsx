"use client";

import React from "react";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";
import { QuickSearchModal } from "./QuickSearchModal";

export const Navbar: React.FC = () => {
  return (
    <>
      <DesktopNav />
      <MobileNav />
      <QuickSearchModal />
    </>
  );
};
