import React from 'react';
import { useMeta } from '../App';
import { SectionHead, Badge, Icon } from '../components/ui';

export default function WebsitePackages() {
  useMeta(
    'Website Packages — The Tech Guider 01',
    'Professional website development packages for businesses, creators and startups.'
  );

  const packages = [
    {
      id: 'starter',
      title: 'Starter',
      price: 'Rs. 4,999',
      type: 'one-time',
      features: [
        '1-page website',
        'Modern responsive design',
        'Mobile and desktop support',
        'About and services sections',
        'WhatsApp contact button',
        'Social media links',
        'Basic SEO setup',
        '1 revision',
      ],
      bestFor: 'personal portfolios, small shops and beginners',
    },
    {
      id: 'business',
      title: 'Business',
      price: 'Rs. 9,999',
      type: 'one-time',
      premium: true,
      features: [
        'Up to 5 pages',
        'Premium custom-styled UI',
        'Mobile responsive layout',
        'Contact form or WhatsApp integration',
        'Google Maps integration',
        'Basic on-page SEO',
        'Social media integration',
        '2 revisions',
      ],
      bestFor: 'local businesses, restaurants, shops and service providers',
    },
    {
      id: 'professional',
      title: 'Professional',
      price: 'Rs. 19,999',
      type: 'one-time',
      features: [
        'Up to 8 pages',
        'More customized UI and branding',
        'Advanced contact and lead forms',
        'Gallery, portfolio or blog setup',
        'SEO and performance optimization',
        'Analytics integration',
        'Deployment and domain connection',
        '3 revisions',
      ],
      bestFor: 'established businesses, agencies and professional brands',
    },
    {
      id: 'ecommerce',
      title: 'E-Commerce',
      price: 'Rs. 34,999',
      type: 'one-time',
      starting: true,
      features: [
        'Online product catalog',
        'Product detail pages',
        'Shopping cart and checkout',
        'Order management',
        'Admin product management',
        'Cash on Delivery setup',
        'WhatsApp order option',
        'Basic SEO',
      ],
      bestFor: 'clothing brands, mobile shops and online stores',
      note: 'Payment gateway fees, advanced integrations and large product catalogs are extra.',
    },
    {
      id: 'custom',
      title: 'Custom Website / Web App',
      price: 'Rs. 49,999+',
      type: 'custom',
      features: [
        'User authentication',
        'Database integration',
        'Custom dashboard',
        'API integrations',
        'Advanced features',
        'Admin panel',
        'Security and deployment setup',
      ],
      bestFor: 'portals, booking platforms and web applications',
      note: 'Final price depends on scope.',
    },
  ];

  // Highlight first three as requested
  const highlighted = packages.slice(0, 3);

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <SectionHead
        eyebrow="Website Development Packages"
        title="Professional website packages for every need"
        sub="Choose the package that fits your goals — or build a custom solution tailored to your vision."
      />

      <div className="mt-3" style={{ marginTop: 32 }}>
        {highlighted.map((pkg) => (
          <div
            key={pkg.id}
            className="card mt-3"
            style={{ marginTop: 28, border: '1px solid var(--border)' }}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold">{pkg.title}</h3>
              <span className="text-2xl font-bold">{pkg.price}</span>
            </div>
            <p className="text-sm text-muted-3 mb-4 capitalize">{pkg.type === 'custom' ? 'Custom quotation required' : 'One-time development fee'}</p>
            <ul className="space-y-2 text-sm text-muted">
              {pkg.features.map((feat) => (
                <li key={feat} style={{ listStyle: 'none' }}>
                  <span className="mr-2" style={{ width: 12, height: 12, borderRadius: 50, background: 'var(--accent)', display: 'inline-block' }} aria-hidden="true" />
                  {feat}
                </li>
              ))}
            </ul>
            {pkg.bestFor && (
              <p className="text-xs text-muted-3 mt-3">{pkg.bestFor}</p>
            )}
            {pkg.note && (
              <p className="text-xs text-warning mt-2">{pkg.note}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4" style={{ marginTop: 32 }}>
        <h3 className="font-bold mb-3">Optional Monthly Services</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold">Basic maintenance</p>
            <p className="text-muted-3">Rs. 999/month</p>
            <p className="text-xs">Updates and small fixes</p>
          </div>
          <div>
            <p className="font-semibold">Business website care</p>
            <p className="text-muted-3">Rs. 2,499/month</p>
            <p className="text-xs">Website care package</p>
          </div>
          <div>
            <p className="font-semibold">Extra page</p>
            <p className="text-muted-3">Rs. 1,000–2,000</p>
            <p className="text-xs">One additional page</p>
          </div>
          <div>
            <p className="font-semibold">Extra revision</p>
            <p className="text-muted-3">Rs. 500–1,000</p>
            <p className="text-xs">Beyond included revisions</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm text-muted-3">
          <strong>Important business rules:</strong> 50% advance, 50% before final handover. Domain and
          hosting should be charged separately unless explicitly included. Free deployment is possible on
          supported platforms, but a custom domain is not automatically free. Clearly define revisions, delivery
          time, content requirements and post-launch support. Third-party API, premium theme, paid plugin and
          payment gateway charges are separate.
        </p>
      </div>
    </div>
  );
}