import React from 'react';
import { Facebook, Twitter, Instagram, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-chinaDark text-white pt-20 pb-10">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-3xl font-bold text-white mb-6">ChinaConnect</h2>
            <p className="text-slate-400 mb-8 max-w-sm">
              Your comprehensive guide to traveling and living in China. We ensure you stay connected and can pay like a local from day one.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="bg-slate-800 p-3 rounded-full hover:bg-chinaRed transition-colors"><Facebook size={20} /></a>
              <a href="#" className="bg-slate-800 p-3 rounded-full hover:bg-chinaRed transition-colors"><Twitter size={20} /></a>
              <a href="#" className="bg-slate-800 p-3 rounded-full hover:bg-chinaRed transition-colors"><Instagram size={20} /></a>
              <a href="#" className="bg-slate-800 p-3 rounded-full hover:bg-chinaRed transition-colors"><Mail size={20} /></a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6">Services</h4>
            <ul className="space-y-4 text-slate-400">
              <li><a href="#guides" className="hover:text-white transition-colors">Payment Guide PDF</a></li>
              <li><a href="#vpn" className="hover:text-white transition-colors">VPN Weekly Pass</a></li>
              <li><a href="#vpn" className="hover:text-white transition-colors">VPN Monthly Pass</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Student Resources</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6">Support</h4>
            <ul className="space-y-4 text-slate-400">
              <li><a href="#" className="hover:text-white transition-colors">Setup Instructions</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Troubleshooting</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm">
          <p>© 2024 ChinaConnect. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Refund Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};