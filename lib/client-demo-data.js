export const CLIENT_DEMO_STORAGE_KEY = 'tgne-service-portal-demo-v1';

export function clientDemoStorageKey(userId) {
  if (typeof userId !== 'string' || !userId) return '';
  return CLIENT_DEMO_STORAGE_KEY + ':' + encodeURIComponent(userId);
}

export const SERVICE_TYPES = {
  web: 'Web & software development',
  ict: 'ICT solutions & hardware',
  design: 'Graphic design & branding',
  print: 'Print & production',
  host: 'Hosting & web domains',
  edu: 'ICT education consultancy'
};

export const ORDER_STATUSES = [
  'Submitted',
  'Quote issued',
  'Approved',
  'In progress',
  'Completed'
];

export const DEMO_ORDERS = [
  {
    id: 'SV-2026-A7K2M9',
    title: 'Corporate website redesign',
    type: 'web',
    status: 'In progress',
    priority: 'High',
    due: '2026-12-05',
    amount: 18500,
    assignedTo: 'Kofi Asante',
    paid: false,
    client: 'Volta Foods Ltd',
    description: 'Refresh the company website and product pages.',
    messages: [
      {
        sender: 'TGNE',
        text: 'Homepage design approved. Starting the product pages this week.'
      }
    ]
  },
  {
    id: 'SV-2026-B4X8P2',
    title: 'Branded merchandise: 500 mugs and notebooks',
    type: 'print',
    status: 'Quote issued',
    priority: 'Normal',
    due: '2026-11-28',
    amount: 6200,
    assignedTo: 'Efua Mensah',
    paid: false,
    client: 'Volta Foods Ltd',
    description: '500 branded mugs and notebooks for the annual staff event.',
    messages: []
  },
  {
    id: 'SV-2026-C9R3T5',
    title: 'Office network and CCTV upgrade',
    type: 'ict',
    status: 'Approved',
    priority: 'Normal',
    due: '2026-12-12',
    amount: 12800,
    assignedTo: 'Yaw Boateng',
    paid: false,
    client: 'Volta Foods Ltd',
    description: 'Upgrade the office network and add CCTV coverage.',
    messages: []
  },
  {
    id: 'SV-2026-D2M6Q1',
    title: 'Annual report design and print',
    type: 'design',
    status: 'Submitted',
    priority: 'Normal',
    due: '2026-12-20',
    amount: 0,
    assignedTo: '',
    paid: false,
    client: 'Volta Foods Ltd',
    description: 'Design and print the 2026 annual report.',
    messages: []
  },
  {
    id: 'SV-2026-E5N7W4',
    title: 'Domain and hosting renewal (3 sites)',
    type: 'host',
    status: 'Completed',
    priority: 'Low',
    due: '2026-11-02',
    amount: 1450,
    assignedTo: 'Kofi Asante',
    paid: true,
    client: 'Volta Foods Ltd',
    description: 'Renew domains and hosting for three websites.',
    messages: []
  }
];
