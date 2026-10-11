import React from 'react';
import { useMeta } from '../App';
import { SectionHead, Badge, Icon } from '../components/ui';

export default function LogoPackages() {
  useMeta(
    'Logo & Design Packages — The Tech Guider 01',
    'Logo design and branding packages for creators, businesses and startups.'
  );

  const packages = [
    {
      id: 'basic',
      title: 'Basic Logo',
      price: 'Rs. 799',
      type: 'one-time',
      features: [
        '1 logo concept',
        'Typography or simple icon',
        'PNG and JPG files',
        'Transparent background PNG',
        '1 revision',
      ],
      bestFor: 'small businesses, personal brands and starter channels',
    },
    {
      id: 'professional',
      title: 'Professional Logo',
      price: 'Rs. 1,499',
      type: 'one-time',
      premium: true,
      features: [
        '2 initial concepts',
        'Custom typography and icon',
        'PNG, JPG and SVG exports',
        'Transparent background',
        'Profile-picture version',
        '2 revisions',
      ],
      bestFor: 'YouTube channels, shops and startups',
    },
    {
      id: 'premium',
      title: 'Premium Branding',
      price: 'Rs. 3,499',
      type: 'one-time',
      features: [
        '3 initial logo concepts',
        'Refined final logo',
        'Color and monochrome versions',
        'PNG, JPG and SVG exports',
        'Basic color palette and font pairing',
        'Social profile logo',
        'Mini brand guide',
        '3 revisions',
      ],
      bestFor: 'established businesses, creators and new brands',
    },
    {
      id: 'kit',
      title: 'Brand Identity Kit',
      price: 'Rs. 6,999+',
      type: 'one-time',
      features: [
        'Complete logo suite',
        'Brand colors and typography',
        'Business card design',
        'Social media profile and cover graphics',
        'Brand guideline document',
        'Selected marketing graphics',
        '3 revisions',
      ],
      bestFor: 'companies, agencies and professional creators',
    },
  ];

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <SectionHead
        eyebrow="Logo & Design Packages"
        title="Professional logo and branding packages"
        sub="Build a visual identity that represents The Tech Guider 01 brand."
      />

      <div className="mt-3" style={{ marginTop: 32 }}>
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="card mt-3"
            style={{ marginTop: 28, border: '1px solid var(--border)' }}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold">{pkg.title}</h3>
              <span className="text-2xl font-bold">{pkg.price}</span>
            </div>
            <p className="text-sm text-muted-3 mb-4 capitalize">{pkg.type === 'one-time' ? 'One-time development fee' : 'Per video'}</p>
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
          </div>
        ))}
      </div>

      <div className="mt-4" style={{ marginTop: 32 }}>
        <h3 className="font-bold mb-3">Extra Design Services</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold">YouTube thumbnail</p>
            <p className="text-muted-3">Rs. 300</p>
          </div>
          <div>
            <p className="font-semibold">YouTube banner</p>
            <p className="text-muted-3">Rs. 599</p>
          </div>
          <div>
            <p className="font-semibold">Gaming/esports logo</p>
            <p className="text-muted-3">Rs. 1,499</p>
          </div>
          <div>
            <p className="font-semibold">YouTube intro/outro</p>
            <p className="text-muted-3">Rs. 999</p>
          </div>
          <div>
            <p className="font-semibold">Social media post</p>
            <p className="text-muted-3">Rs. 250</p>
          </div>
          <div>
            <p className="font-semibold">Business card design</p>
            <p className="text-muted-3">Rs. 499</p>
          </div>
          <div>
            <p className="font-semibold">Simple animated logo</p>
            <p className="text-muted-3">Rs. 1,499</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm text-muted-3">
          <strong>Client payment rules:</strong> 50% advance to start; remaining 50% before final files.
          Include only the stated number of revisions. Major redesigns after approval cost extra.
          Editable source files should be specified in the package or quoted separately. Fonts, stock footage,
          music and other paid assets may have additional licensing costs.
        </p>
      </div>
    </div>
  );
}