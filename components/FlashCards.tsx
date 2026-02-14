import React from 'react';
import { HelpCircle, CreditCard, Globe, Lock, Smartphone, Gift, Briefcase } from 'lucide-react';
import { FaqItem, SectionId } from '../types';

export const FlashCards: React.FC = () => {
  const faqs: FaqItem[] = [
    {
      question: "Can foreigners use WeChat/Alipay?",
      answer: "Yes! Both platforms are now open to international users.",
      icon: <Globe className="w-8 h-8 text-white" />
    },
    {
      question: "Do international cards work?",
      answer: "Yes. Visa, Mastercard, and JCB are now supported.",
      icon: <CreditCard className="w-8 h-8 text-white" />
    },
    {
      question: "Can I use it outside China?",
      answer: "Yes! With an international card linked, you can use WeChat Pay and Alipay globally - at overseas online merchants and in regions accepting these payments.",
      icon: <Lock className="w-8 h-8 text-white" />
    },
    {
      question: "Are there transaction fees?",
      answer: "Usually free! 3% fee applies only on transactions over 200 CNY.",
      icon: <HelpCircle className="w-8 h-8 text-white" />
    },
    {
      question: "WeChat Pay vs Alipay?",
      answer: "WeChat is social + payments. Alipay is financial-first. You need both.",
      icon: <Smartphone className="w-8 h-8 text-white" />
    },
    {
      question: "What are the spending limits?",
      answer: "Typically 6,000 CNY per transaction and 50,000 CNY per month.",
      icon: <CreditCard className="w-8 h-8 text-white" />
    },
    {
      question: "What is the 'Tour Pass'?",
      answer: "Alipay's 90-day account service specifically for travelers.",
      icon: <Globe className="w-8 h-8 text-white" />
    },
    {
      question: "What documents do I need?",
      answer: "Your passport, a phone number, and your bank card.",
      icon: <Lock className="w-8 h-8 text-white" />
    },
    {
      question: "How long does verification take?",
      answer: "Usually instant, but international cards on WeChat can take 24h.",
      icon: <HelpCircle className="w-8 h-8 text-white" />
    },
    {
      question: "Is cash still accepted?",
      answer: "Rarely. Most shops and taxis only accept digital payments.",
      icon: <Smartphone className="w-8 h-8 text-white" />
    },
    {
      question: "Can I send Red Packets?",
      answer: "Yes! But the limit is 200 CNY per packet for gifts.",
      icon: <Gift className="w-8 h-8 text-white" />
    },
    {
      question: "Advice for long stays?",
      answer: "Open a local Chinese bank account for better limits and ease.",
      icon: <Briefcase className="w-8 h-8 text-white" />
    }
  ];

  return (
    <section id={SectionId.FAQ} className="py-20 bg-chinaDark text-white overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Payment Reality Check</h2>
          <p className="text-slate-400">Hover over the 12 cards below to learn the essentials of paying in China.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {faqs.map((faq, index) => (
            <div key={index} className="group w-64 h-80 perspective-1000 cursor-pointer">
              <div className="relative w-full h-full duration-500 transform-style-3d group-hover:rotate-y-180 shadow-xl rounded-2xl">
                {/* Front Side */}
                <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 flex flex-col items-center justify-center border border-slate-700">
                  <div className="mb-6 p-4 bg-chinaRed/20 rounded-full text-chinaRed">
                    {faq.icon}
                  </div>
                  <h3 className="text-xl font-bold text-center leading-snug">
                    {faq.question}
                  </h3>
                  <div className="mt-4 text-xs text-slate-500 uppercase tracking-widest font-bold">
                    Flip for Answer
                  </div>
                </div>

                {/* Back Side */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-chinaRed rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="text-white font-medium text-lg leading-relaxed">
                    "{faq.answer}"
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};