import { useSettingsStore } from '../store/useSettingsStore';
import { t } from '../lib/i18n';

export function useTranslation() {
  const { interfaceLanguage } = useSettingsStore();
  
  return {
    t: (key) => t(key, interfaceLanguage),
    lang: interfaceLanguage
  };
}
