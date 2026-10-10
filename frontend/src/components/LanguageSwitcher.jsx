import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'ja', name: '日本語' }
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (e) => {
    const selectedCode = e.target.value;
    i18n.changeLanguage(selectedCode);
  };

  useEffect(() => {
    // Handle RTL for Arabic
    const currentLang = languages.find(l => l.code === i18n.language) || languages[0];
    document.documentElement.dir = currentLang.dir || 'ltr';
  }, [i18n.language]);

  return (
    <div className="flex items-center space-x-2 text-black">
      <Globe size={18} className="text-black" />
      <select
        className="bg-transparent border-none text-sm text-black focus:outline-none cursor-pointer"
        onChange={handleLanguageChange}
        value={i18n.language.substring(0, 2)}
      >
        {languages.map((lng) => (
          <option key={lng.code} value={lng.code} className="bg-white text-black">
            {lng.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;
