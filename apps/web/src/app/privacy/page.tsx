import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Janki Rasoi',
  description: 'Learn how Janki Rasoi securely handles customer contact information, delivery addresses, and payment data.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="flex flex-col relative w-full pt-20 pb-28 bg-[#FFF9F0] min-h-screen">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#77786F] mb-4">
          <Link href="/" className="hover:text-[#38754A]">Home</Link>
          <span>/</span>
          <span className="text-[#292D26] font-semibold">Privacy Policy</span>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-[#EEE7DC] flex flex-col gap-6">
          <div className="border-b border-[#EEE7DC] pb-4">
            <span className="text-xs uppercase tracking-wider text-[#38754A] font-bold">Legal &amp; Data Transparency</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#292D26] font-headline mt-1">
              Privacy Policy
            </h1>
            <p className="text-xs text-[#77786F] mt-1">
              Last updated: October 2026 | Effective for all Janki Rasoi orders
            </p>
          </div>

          {/* Section 1 */}
          <section className="flex flex-col gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#292D26]">
              1. Information We Collect
            </h2>
            <p className="text-xs sm:text-sm text-[#77786F] leading-relaxed">
              When you order a homestyle meal or subscribe to our daily lunch/dinner service, we collect only the essential details needed for fresh meal dispatch and handover:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-[#77786F] space-y-1">
              <li><strong className="text-[#292D26]">Contact Information:</strong> Your name, phone number, and optional email for order confirmations and OTP verification.</li>
              <li><strong className="text-[#292D26]">Delivery Address:</strong> Flat/house number, building name, street, nearby landmarks, and South Delhi postal pincode.</li>
              <li><strong className="text-[#292D26]">Order Preferences:</strong> Meal selections, portion sizes, spice level notes, and optional instructions for our kitchen or delivery riders.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="flex flex-col gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#292D26]">
              2. How Your Information Is Used
            </h2>
            <p className="text-xs sm:text-sm text-[#77786F] leading-relaxed">
              We never sell, rent, or trade your personal data. Your information is used strictly to:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-[#77786F] space-y-1">
              <li>Process and prepare your meal batches fresh before delivery windows.</li>
              <li>Dispatch the delivery rider to your specified address and generate the secure 6-digit delivery verification OTP.</li>
              <li>Send critical transactional updates via SMS/WhatsApp regarding meal preparation and rider arrival.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="flex flex-col gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#292D26]">
              3. Payment Security &amp; No Stored Card Data
            </h2>
            <p className="text-xs sm:text-sm text-[#77786F] leading-relaxed">
              We support both Cash on Delivery (COD) and secure UPI/Online payments. Online payments are processed directly through certified RBI-compliant payment gateways with 256-bit SSL encryption. Janki Rasoi never stores your bank account numbers, UPI PINs, or credit/debit card numbers.
            </p>
          </section>

          {/* Section 4 */}
          <section className="flex flex-col gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#292D26]">
              4. Zero Marketing Spam Policy
            </h2>
            <p className="text-xs sm:text-sm text-[#77786F] leading-relaxed">
              We respect your peace of mind. We do not bombard customers with unsolicited marketing robocalls, third-party promotional SMS, or spam emails.
            </p>
          </section>

          {/* Section 5 */}
          <section className="flex flex-col gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#292D26]">
              5. Contact Kitchen Administration
            </h2>
            <p className="text-xs sm:text-sm text-[#77786F] leading-relaxed">
              If you have any questions or wish to delete your saved delivery address, please reach out to our team:
            </p>
            <div className="p-3.5 bg-[#FFF9F0] rounded-xl border border-[#EEE7DC] flex flex-col gap-1 text-xs">
              <span className="font-bold text-[#292D26]">Janki Rasoi Customer Desk</span>
              <span className="text-[#77786F]">Malviya Nagar, South Delhi, Delhi 110017</span>
              <span className="text-[#77786F]">Phone: <a href="tel:+919876543210" className="text-[#38754A] font-semibold">+91 98765 43210</a></span>
              <span className="text-[#77786F]">Email: <a href="mailto:care@jankirasoi.com" className="text-[#38754A] font-semibold">care@jankirasoi.com</a></span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
