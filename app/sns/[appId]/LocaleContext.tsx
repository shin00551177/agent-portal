"use client";

import { createContext, useContext } from "react";
import { getSnsT, type SnsTranslations } from "@/lib/i18n/sns";

const LocaleCtx = createContext<{ locale: string; t: SnsTranslations }>({
  locale: "ja",
  t: getSnsT("ja"),
});

export function SnsLocaleProvider({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  return (
    <LocaleCtx.Provider value={{ locale, t: getSnsT(locale) }}>
      {children}
    </LocaleCtx.Provider>
  );
}

export function useSnsLocale() {
  return useContext(LocaleCtx);
}
