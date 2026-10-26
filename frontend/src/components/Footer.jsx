import { useLanguage } from '../i18n/Language';
import React from 'react';
import { PhoneCall } from 'lucide-react';

export default function Footer() {
 const { t } = useLanguage();
  return (
    <footer className="gov-footer">
      <div className="footer-columns">
        <div className="footer-col">
          <h4>{t("Quick Links")}</h4>
          <ul>
            <li><a href="#home">{t("Home")}</a></li>
            <li><a href="#about">{t("About the Portal")}</a></li>
            <li><a href="#manual">{t("User Manual & Standard Operating Procedures")}</a></li>
            <li><a href="#analytics">{t("Reports & National Analytics")}</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>{t("Important Links")}</h4>
          <ul>
            <li><a href="https://www.aicte-india.org" target="_blank" rel="noreferrer">{t("AICTE Official Portal")}</a></li>
            <li><a href="https://pgportal.gov.in" target="_blank" rel="noreferrer">{t("CPGRAMS Central Grievance")}</a></li>
            <li><a href="https://www.mygov.in" target="_blank" rel="noreferrer">{t("MyGov India")}</a></li>
            <li><a href="https://www.digitalindia.gov.in" target="_blank" rel="noreferrer">{t("Digital India Initiative")}</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>{t("Support & Compliance")}</h4>
          <ul>
            <li><a href="#contact">{t("Contact AICTE Nodal Bureau")}</a></li>
            <li><a href="#faq">{t("Frequently Asked Questions (FAQs)")}</a></li>
            <li><a href="#browser">{t("Browser Compatibility & Security")}</a></li>
            <li><a href="#accessibility">{t("Accessibility Statement (GIGW Compliant)")}</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>{t("Helpdesk / Helpline")}</h4>
          <div className="footer-helpdesk">
            <div className="phone-icon"><PhoneCall size={24} /></div>
            <div className="helpdesk-text">
              <div style={{ fontSize: '12px', color: '#CBD5E1' }}>Toll Free AICTE Grievance:</div>
              <div className="toll-free">1800-11-5566</div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                (Mon – Fri, 9:30 AM – 6:00 PM IST)
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div>
          © 2026 All Rights Reserved. Content Owned & Maintained by All India Council for Technical Education (AICTE), Ministry of Education, Govt. of India.
        </div>
        <div className="digital-india-badge">
          <span className="proto-tag">SIH 2026 Prototype (SIH26264)</span>
          <span style={{ fontWeight: 700, color: '#FF9933' }}>{t("Digital India")}</span>
        </div>
      </div>
    </footer>
  );
}
