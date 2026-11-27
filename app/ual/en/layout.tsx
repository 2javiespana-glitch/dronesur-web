import { LangOverride } from '@/components/site-provider'

// Todo lo que cuelga de /ual/en se muestra en inglés (igual que /en en la web principal).
export default function UalEnglishLayout({ children }: { children: React.ReactNode }) {
  return <LangOverride lang="en">{children}</LangOverride>
}
