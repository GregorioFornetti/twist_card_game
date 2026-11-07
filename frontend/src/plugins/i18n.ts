import { createI18n } from 'vue-i18n';
import enUS from '@/locales/en-US.json';
import ptBR from '@/locales/pt-BR.json';
type MessageSchema = typeof enUS;
export const LOCALES = [
  { code: 'en-US', label: 'English' },
  { code: 'pt-BR', label: 'Português' }
] as const;
const stored = typeof window !== 'undefined' ? window.localStorage.getItem('twist-lang') : null;
const browser = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
const initial = stored === 'pt-BR' || stored === 'en-US' ? stored : browser.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en-US';
const I18n = createI18n<[MessageSchema], 'en-US' | 'pt-BR'>({ legacy: false, fallbackLocale: 'en-US', locale: initial, messages: { 'en-US': enUS, 'pt-BR': ptBR as MessageSchema } });
export function setLocale(code: string) {
  if (code === 'pt-BR' || code === 'en-US') (I18n.global as unknown as { locale: { value: string } }).locale.value = code;
  try { window.localStorage.setItem('twist-lang', code); } catch { /* storage unavailable */ }
}
export default I18n;
