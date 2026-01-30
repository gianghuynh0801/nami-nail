import { getTranslations, getLocale } from 'next-intl/server';
import { Link, redirect } from '@/i18n/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Sparkles, Calendar, Users, Clock, ArrowRight } from 'lucide-react';
import DecorativeFlower from '@/components/DecorativeFlower';

export default async function Home() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations('HomePage');
  const locale = await getLocale();

  if (session) {
    redirect({ href: '/dashboard', locale });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-beige-light via-white to-beige-light relative overflow-hidden">
      <div className="absolute top-20 left-10 opacity-10 animate-float">
        <DecorativeFlower size={300} />
      </div>
      <div
        className="absolute bottom-20 right-10 opacity-10 animate-float"
        style={{ animationDelay: '1s' }}
      >
        <DecorativeFlower size={250} />
      </div>
      <div
        className="absolute top-1/2 left-1/4 opacity-5 animate-float"
        style={{ animationDelay: '2s' }}
      >
        <DecorativeFlower size={200} />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full mb-6 shadow-sm border border-beige-dark/20 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-medium text-gray-700">
              {t('badge')}
            </span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 animate-slide-up">
            <span className="gradient-text">{t('title')}</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto animate-fade-in leading-relaxed">
            {t('subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-400 text-white rounded-full hover:bg-primary-500 transition-all hover:shadow-xl hover:shadow-primary-400/30 font-semibold text-lg"
            >
              {t('login')}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            <div className="card-modern p-6 rounded-2xl animate-fade-in">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-primary-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('featureBookingTitle')}
              </h3>
              <p className="text-gray-600">{t('featureBookingDesc')}</p>
            </div>

            <div
              className="card-modern p-6 rounded-2xl animate-fade-in"
              style={{ animationDelay: '0.1s' }}
            >
              <div className="w-12 h-12 bg-beige rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('featureStaffTitle')}
              </h3>
              <p className="text-gray-600">{t('featureStaffDesc')}</p>
            </div>

            <div
              className="card-modern p-6 rounded-2xl animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-primary-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('featureRealtimeTitle')}
              </h3>
              <p className="text-gray-600">{t('featureRealtimeDesc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
