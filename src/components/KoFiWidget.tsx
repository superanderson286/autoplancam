import React from 'react';
import { useTranslation } from 'react-i18next';

const KoFiWidget: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex space-x-2">
      <a
        href="https://ko-fi.com/Z8Z41KPMNI"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center px-5 py-3 text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        <img src="https://storage.ko-fi.com/cdn/cup-border.png" alt="Ko-fi donations" className="w-6 h-6 mr-2" />
        {t('Invítame un café en Ko-fi')}
      </a>
      <a
        href="https://paypal.me/superanderson286"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center px-5 py-3 text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        <img src="https://images.icon-icons.com/2429/PNG/512/paypal_logo_icon_147252.png" alt="PayPal donations" className="w-6 h-6 mr-2" />
        {t('Invítame un café en PayPal')}
      </a>
    </div>
  );
};

export default KoFiWidget;
