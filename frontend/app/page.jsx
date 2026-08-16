import React from 'react';
import Image from 'next/image';
import heroImage from '@/public/assets/heroImage.jpg';
import quick from '@/public/assets/quick-pickup.jpg';
import safty from '@/public/assets/safty.jpg';
import Link from 'next/link';
import support from '@/public/assets/support.jpg';

const services = [
  {
    icon: '🏍️',
    title: 'Bike-Taxi',
    desc: 'Beat traffic, ride quicker',
    gradient: 'from-orange-500 to-amber-400',
    shadow: 'shadow-orange-200',
  },
  {
    icon: '🛺',
    title: 'Auto',
    desc: 'Affordable & comfortable rides',
    gradient: 'from-violet-500 to-purple-400',
    shadow: 'shadow-purple-200',
  },
  {
    icon: '🚗',
    title: 'Cabs',
    desc: 'Comfortable rides in AC cars',
    gradient: 'from-sky-500 to-blue-400',
    shadow: 'shadow-blue-200',
  },
  {
    icon: '💎',
    title: 'Premium',
    desc: 'Luxury rides with top-rated drivers',
    gradient: 'from-rose-500 to-pink-400',
    shadow: 'shadow-rose-200',
  },
  {
    icon: '🛣️',
    title: 'Outstation',
    desc: 'Affordable outstation trips',
    gradient: 'from-emerald-500 to-teal-400',
    shadow: 'shadow-emerald-200',
  },
];

const page = () => {
  return (
    <main className="bg-white font-[Poppins,sans-serif] overflow-x-hidden">

      {/* hero section */}
      <section className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 pt-[70px] overflow-hidden">

        {/* blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-orange-500/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] rounded-full bg-orange-600/15 blur-[80px] pointer-events-none" />

        {/* grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

          {/* ── Left ── */}
          <div className="space-y-8">
            {/* badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              150+ Cities · 10M+ Riders
            </div>

            <h1 className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.08]">
              India&apos;s <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">#1 Ride-hailing</span> App
            </h1>

            <p className="text-lg text-gray-400 leading-relaxed max-w-md">
              Quick, affordable rides at your doorstep — anytime, anywhere across India.
            </p>

            {/* Search form */}
            <div className="flex flex-col gap-4 max-w-md bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-3xl shadow-2xl">
              <Link
                href="/book-ride"
                className="mt-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-4 rounded-xl transition-all duration-250 shadow-[0_6px_24px_rgba(255,90,0,0.4)] hover:shadow-[0_8px_30px_rgba(255,90,0,0.5)] hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm text-center"
              >
                🚀 Book Ride Now
              </Link>
            </div>

            {/* trust row */}
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex -space-x-2">
                {['bg-pink-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500'].map((c, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full ${c} border-2 border-gray-900 flex items-center justify-center text-white text-xs font-bold`}>
                    {['P', 'R', 'A', 'M'][i]}
                  </div>
                ))}
              </div>
              <span><span className="text-white font-semibold">10M+ happy riders</span> trust us daily</span>
            </div>
          </div>

          {/* ── Right — Hero Image ── */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              {/* glow ring */}
              <div className="absolute -inset-4 rounded-3xl bg-orange-500/20 blur-2xl" />
              <Image
                src={heroImage}
                alt="RideFlow Ride Booking"
                className="relative rounded-3xl shadow-2xl object-cover max-w-full h-auto max-h-[520px]"
                priority
              />
              {/* floating ETA badge */}
              <div className="absolute -bottom-4 -left-6 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-lg">✓</div>
                <div>
                  <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Ride Confirmed</div>
                  <div className="text-sm font-bold text-gray-800">ETA: 2 mins</div>
                </div>
              </div>
              {/* floating rating badge */}
              <div className="absolute -top-4 -right-6 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2.5">
                <span className="text-yellow-400 text-xl">⭐</span>
                <div>
                  <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Avg. Rating</div>
                  <div className="text-sm font-bold text-gray-800">4.9 / 5.0</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* bottom wave */}
        <div className="relative z-10">
          <svg viewBox="0 0 1440 70" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 70 C360 0 1080 0 1440 70 L1440 70 L0 70Z" fill="#ffffff" />
          </svg>
        </div>
      </section>

      {/* our services */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">

          {/* heading */}
          <div className="text-center mb-16 space-y-3">
            <span className="text-orange-500 font-semibold text-sm tracking-widest uppercase">Ride Options</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Our Services</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Choose from a range of ride options designed for every need and budget.</p>
          </div>

          {/* cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {services.map(({ icon, title, desc, gradient, shadow }) => (
              <div
                key={title}
                className={`group relative bg-white border border-gray-100 rounded-3xl p-6 text-center shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden`}
              >
                {/* icon circle */}
                <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${gradient} shadow-lg ${shadow} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {icon}
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1.5">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                {/* bottom accent bar */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* we offering */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">

          {/* heading */}
          <div className="text-center mb-16 space-y-3">
            <span className="text-orange-500 font-semibold text-sm tracking-widest uppercase">Benefits</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">What We Offer</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Built around your comfort, safety, and convenience — every single ride.</p>
          </div>

          {/* 3-column cards */}
          <div className="grid sm:grid-cols-3 gap-8">

            {/* Quick Pickup */}
            <div className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
              <div className="relative overflow-hidden h-52">
                <Image
                  src={quick}
                  alt="Quick pickup"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                <div className="absolute bottom-4 left-4 w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-xl shadow-lg">⚡</div>
              </div>
              <div className="p-6 space-y-2">
                <h4 className="font-bold text-gray-900 text-lg">Quick PickUp</h4>
                <p className="text-sm text-gray-500 leading-relaxed">Get picked up in minutes with our smart booking process and nearby captain network.</p>
                <div className="pt-2 flex items-center gap-1.5 text-orange-500 text-sm font-semibold">
                  <span>Avg. 2 min wait</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </div>
              </div>
            </div>

            {/* 24/7 Support */}
            <div className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
              <div className="relative overflow-hidden h-52">
                <Image
                  src={support}
                  alt="24/7 Support"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                <div className="absolute bottom-4 left-4 w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center text-xl shadow-lg">🎧</div>
              </div>
              <div className="p-6 space-y-2">
                <h4 className="font-bold text-gray-900 text-lg">24/7 Support</h4>
                <p className="text-sm text-gray-500 leading-relaxed">We&apos;re here to help you anytime, anywhere. Our team is always just one tap away.</p>
                <div className="pt-2 flex items-center gap-1.5 text-violet-500 text-sm font-semibold">
                  <span>Always available</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </div>
              </div>
            </div>

            {/* Safety First */}
            <div className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
              <div className="relative overflow-hidden h-52">
                <Image
                  src={safty}
                  alt="Safety First"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                <div className="absolute bottom-4 left-4 w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-xl shadow-lg">🛡️</div>
              </div>
              <div className="p-6 space-y-2">
                <h4 className="font-bold text-gray-900 text-lg">Safety First</h4>
                <p className="text-sm text-gray-500 leading-relaxed">Your safety is our priority. All rides are tracked, monitored, and insured up to ₹5 Lakh.</p>
                <div className="pt-2 flex items-center gap-1.5 text-emerald-500 text-sm font-semibold">
                  <span>100% insured rides</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* earn with us */}
      <section className="py-24 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 relative overflow-hidden">

        {/* blobs */}
        <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-orange-500/15 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] rounded-full bg-amber-400/10 blur-[80px] pointer-events-none" />

        {/* grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">

          {/* ── Left — illustration / stats ── */}
          <div className="grid grid-cols-2 gap-5">
            {[
              { emoji: '💰', label: 'Daily Earnings', value: '₹1,200+', color: 'from-orange-500 to-amber-400' },
              { emoji: '🕐', label: 'Flexible Hours', value: 'Work Anytime', color: 'from-violet-500 to-purple-400' },
              { emoji: '⚡', label: 'Instant Payout', value: 'Daily Withdraw', color: 'from-sky-500 to-blue-400' },
              { emoji: '🏆', label: 'Top Earners', value: '₹40K / Month', color: 'from-emerald-500 to-teal-400' },
            ].map(({ emoji, label, value, color }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 hover:bg-white/10 transition-colors duration-300">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-xl shadow-lg`}>
                  {emoji}
                </div>
                <div>
                  <div className="text-white/50 text-xs font-medium mb-0.5">{label}</div>
                  <div className="text-white font-bold text-base">{value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Right — content ── */}
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              Partner with Us
            </div>

            <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Earn with <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">RideFlow</span>
            </h2>

            <p className="text-gray-400 text-lg leading-relaxed">
              Become a RideFlow partner and earn a handsome income with the best payout structure in the industry. Work on your own schedule, earn daily, and grow with us.
            </p>

            {/* perks list */}
            <ul className="space-y-3">
              {[
                'Zero joining fee — start earning today',
                'Daily earnings credited to your wallet',
                'Full accident & medical insurance coverage',
                'Dedicated 24/7 captain support team',
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-gray-300 text-sm">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 text-xs flex-shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-4 pt-2">
              <button className="px-8 py-4 rounded-full bg-orange-500 text-white font-bold text-sm shadow-[0_6px_24px_rgba(255,90,0,0.4)] hover:bg-orange-600 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(255,90,0,0.5)] transition-all duration-250">
                🚀 Start Earning
              </button>
              <button className="px-8 py-4 rounded-full border border-white/20 text-white font-semibold text-sm hover:bg-white/10 transition-all duration-250">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
};

export default page;