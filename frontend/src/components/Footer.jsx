import React from 'react';
import { PhoneCall } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="gov-footer">
      <div className="footer-columns">
        <div className="footer-col">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About the Portal</a></li>
            <li><a href="#manual">User Manual & Standard Operating Procedures</a></li>
            <li><a href="#analytics">Reports & National Analytics</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Important Links</h4>
          <ul>
            <li><a href="https://www.aicte-india.org" target="_blank" rel="noreferrer">AICTE Official Portal</a></li>
            <li><a href="https://pgportal.gov.in" target="_blank" rel="noreferrer">CPGRAMS Central Grievance</a></li>
            <li><a href="https://www.mygov.in" target="_blank" rel="noreferrer">MyGov India</a></li>
            <li><a href="https://www.digitalindia.gov.in" target="_blank" rel="noreferrer">Digital India Initiative</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Support & Compliance</h4>
          <ul>
            <li><a href="#contact">Contact AICTE Nodal Bureau</a></li>
            <li><a href="#faq">Frequently Asked Questions (FAQs)</a></li>
            <li><a href="#browser">Browser Compatibility & Security</a></li>
            <li><a href="#accessibility">Accessibility Statement (GIGW Compliant)</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Helpdesk / Helpline</h4>
          <div className="footer-helpdesk">
            <div className="phone-icon">🎧</div>
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
          <span style={{ fontWeight: 700, color: '#FF9933' }}>Digital India</span>
        </div>
      </div>
    </footer>
  );
}
