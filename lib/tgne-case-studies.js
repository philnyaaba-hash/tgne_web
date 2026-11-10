export const CASE_STUDY_GROUPS = ['All work', 'Web & software', 'Brand & print', 'ICT & infrastructure', 'Education'];

export const TGNE_CASE_STUDIES = [
  {
    slug: 'client-portal-and-office-workspace',
    title: 'One sign-in for the client desk and the back office',
    client: 'TGNE Solutions · internal platform',
    sector: 'Professional services',
    group: 'Web & software',
    location: 'Tema, Ghana',
    year: '2026',
    duration: '12 weeks',
    featured: true,
    summary:
      'Service requests, quotes, documents and visitor access were living in separate places. We built one permission-aware platform so clients and staff see the same work from different sides.',
    intro:
      'TGNE runs design, print, ICT and training work for corporate clients at the same time. Every job creates paperwork — a request, a quote, an invoice, a delivery note, a signed document. When that paperwork lives in inboxes and spreadsheets, nobody can answer the only question that matters: where is this job right now?',
    cover: {
      src: '/assets/tgne-collection/TGNE-Software-Dashboard-and-Analytics.jpg',
      alt: 'Analytics dashboard from the TGNE software portfolio, showing reporting panels and summary metrics'
    },
    services: ['Web & app development', 'Hosting & web domains', 'ICT solutions & hardware'],
    metrics: [
      { value: '24', label: 'Role-aware workspaces', note: '16 for staff, 8 for clients' },
      { value: '37', label: 'Data models', note: 'One schema, one source of truth' },
      { value: '1', label: 'Sign-in', note: 'Permissions decide what you see' }
    ],
    challenge: [
      'A client asking for branded stationery, a website refresh and staff training in the same month generated three unrelated conversations. Staff could not see the full relationship, and the client could not see progress on any of it without calling.',
      'Internally, the office had its own problems. Visitor check-in was a paper book, attendance was a spreadsheet, and finance reconciled invoices by hand. Each tool worked alone; none of them agreed with the others.'
    ],
    approach: [
      {
        title: 'Model the work, not the departments',
        copy: 'We started from the lifecycle of a service request — submitted, quoted, approved, in production, delivered, invoiced — and let roles and permissions fall out of that instead of inventing a screen per department.'
      },
      {
        title: 'One identity, two experiences',
        copy: 'Staff and clients authenticate the same way. A permission set decides whether the session opens the office workspace or the client portal, so there is no second account to provision and no parallel user table to keep in sync.'
      },
      {
        title: 'Keep the office floor in the system',
        copy: 'Visitor passes, QR check-in and check-out, room booking and attendance were folded into the same platform, because the receptionist is part of the client relationship too.'
      },
      {
        title: 'Make it usable without a database',
        copy: 'A seeded local demo mode lets the team review flows, train new staff and test changes on a laptop with no network connection and no production data at risk.'
      }
    ],
    delivered: [
      'A client portal covering orders, quotes, invoices, documents, payments and support',
      'An office workspace with client desk, finance, visitor operations, attendance, compliance, growth and audit panels',
      'QR visitor passes with check-in, check-out and correction history',
      'A private document vault with per-client access control',
      'Role and permission management with a full audit trail',
      'Public service request forms feeding straight into the client desk',
      'Seeded demo accounts and an offline-capable local mode'
    ],
    outcome: [
      'The platform now carries 83 API endpoints over 37 data models, with every mutation written to an audit event. Staff open one workspace and see what needs attention; clients open one portal and see what is happening with their work.',
      'Because permissions are resolved server-side on every request, the same deployment serves both audiences without exposing office data to a client session. Adding a new service line means adding a permission, not rebuilding the app.'
    ],
    reflection: {
      text: 'The brief was never “build us an app”. It was “stop losing track of things”. Once we modelled the lifecycle of a job, the screens almost designed themselves.',
      attribution: 'TGNE delivery team'
    },
    tools: ['Next.js 15', 'React 19', 'Prisma', 'Neon Postgres', 'Role-based access control', 'QR visitor passes']
  },
  {
    slug: 'digital-classroom-rollout',
    title: 'From a computer lab to a digital classroom',
    client: 'Training centre · Tema Community 11',
    sector: 'Education',
    group: 'Education',
    location: 'Tema, Ghana',
    year: '2026',
    duration: '9 weeks',
    featured: true,
    summary:
      'Machines were available but lessons were not. We rebuilt the lab around a classroom management system and trained the instructors to run it themselves.',
    intro:
      'A room full of computers is not ICT education. The centre had hardware, a projector and a timetable, but every session still depended on one person who knew how everything was wired together. When that person was absent, the lab closed.',
    cover: {
      src: '/assets/tgne-collection/TGNE-Digital-Classroom-Management-System.jpg',
      alt: 'Digital classroom management system interface from the TGNE education portfolio'
    },
    services: ['ICT education consultancy', 'ICT solutions & hardware', 'Web & app development'],
    metrics: [
      { value: '6', label: 'Instructors trained', note: 'Each can run a full session alone' },
      { value: '4', label: 'Course tracks', note: 'From digital literacy to applied skills' },
      { value: '0', label: 'Single points of failure', note: 'Documented, repeatable setup' }
    ],
    challenge: [
      'Sessions were improvised. Learners arrived at different levels, the instructor spent the first twenty minutes fixing machines, and there was no record of who had completed what.',
      'The centre wanted to issue certificates that meant something, which required assessment evidence rather than attendance alone.'
    ],
    approach: [
      {
        title: 'Audit before buying',
        copy: 'We inventoried every machine, tested what it could actually run and wrote a repair-and-replace list. Two units were retired, four were rebuilt, and nothing new was purchased until the existing stock was working.'
      },
      {
        title: 'Standardise the room',
        copy: 'A single documented image, a fixed network layout and a classroom management system that lets an instructor see every screen, push a lesson and lock attention without walking the rows.'
      },
      {
        title: 'Teach the teachers first',
        copy: 'Instructors trained on the same material they would deliver, then ran supervised sessions before taking a class alone. Every procedure was written down in language a new hire could follow.'
      },
      {
        title: 'Assess, then certify',
        copy: 'Practical tasks with observable outcomes replaced the end-of-course written test, so a certificate reflects work a learner actually produced.'
      }
    ],
    delivered: [
      'Hardware audit, rebuild and documented standard image for the lab',
      'Classroom management system with screen monitoring and lesson broadcast',
      'Four structured course tracks with lesson plans and practical assessments',
      'Instructor training and a written operations runbook',
      'Certificate and award printing produced in-house',
      'Termly review schedule with the centre’s management'
    ],
    outcome: [
      'Six instructors can now open, run and close a session independently. Learner progress is recorded per module, and certificates are issued against completed practical work.',
      'The runbook removed the dependency on any one person. When a machine fails, the documented recovery steps get the room back to a teaching state within the same session.'
    ],
    reflection: {
      text: 'Training only sticks when the people delivering it can also fix it. We spent as much time on the runbook as on the software.',
      attribution: 'TGNE education consultancy'
    },
    tools: ['Classroom management', 'Hardware imaging', 'Practical assessment design', 'Certificate production']
  },
  {
    slug: 'brand-identity-and-print-programme',
    title: 'One brand, consistent from the jar to the invoice',
    client: 'Food producer · Greater Accra',
    sector: 'Food & retail',
    group: 'Brand & print',
    location: 'Accra, Ghana',
    year: '2025',
    duration: '7 weeks',
    featured: true,
    summary:
      'A growing producer had five different logos in circulation. We rebuilt the identity once, then applied it across packaging, stationery, apparel and promotional print.',
    intro:
      'The product was good and the shelves were moving, but the brand looked different everywhere it appeared. Labels, business cards, delivery bags and social posts had each been designed separately, by different people, at different times.',
    cover: {
      src: '/assets/tgne-collection/TGNE-Branded-Stationery-Set.jpg',
      alt: 'Coordinated branded stationery set produced by TGNE, including cards, letterhead and notebooks'
    },
    services: ['Graphic design & branding', 'Print & production'],
    metrics: [
      { value: '1', label: 'Master identity', note: 'Locked logo, colour and type rules' },
      { value: '18', label: 'Applied artefacts', note: 'Packaging through to apparel' },
      { value: '2', label: 'Print finishes', note: 'Screen-ready and large-format' }
    ],
    challenge: [
      'Every new print run started from scratch because there was no master artwork. Colours drifted between suppliers, the logo was redrawn from a low-resolution JPEG, and legal label text was re-typed each time.',
      'The producer was also preparing for retail listings that required consistent packaging photography and barcode-ready label artwork.'
    ],
    approach: [
      {
        title: 'Rebuild the mark as vector',
        copy: 'We redrew the logo from the best available reference, produced locked master files in vector format, and defined clear-space, minimum-size and monochrome rules so it survives any supplier.'
      },
      {
        title: 'Fix colour at the source',
        copy: 'A short palette with CMYK, RGB and Pantone references, plus a printed proof sheet the producer can hand to any printer. No more guessing from a phone screen.'
      },
      {
        title: 'Design the system, then the items',
        copy: 'Label, jar wrap, carton, business card, letterhead, invoice, notebook, apron, t-shirt, mug and gift box were all laid out from one grid and one type scale.'
      },
      {
        title: 'Proof before production',
        copy: 'Physical proofs on the actual stock, checked under shop lighting, before any full run. Two label revisions happened at proof stage rather than after five hundred jars were printed.'
      }
    ],
    delivered: [
      'Vector master logo with usage rules and a one-page brand sheet',
      'Colour palette with CMYK, RGB and Pantone references plus printed proof sheet',
      'Product label and jar wrap artwork, barcode-ready for retail listing',
      'Stationery set: business cards, letterhead, invoice and branded notebooks',
      'Apparel and merchandise: aprons, t-shirts, mugs and gift boxes',
      'Promotional print and packaging photography direction',
      'Supplier-ready artwork pack with bleed, trim and finish notes'
    ],
    outcome: [
      'Eighteen artefacts now come from one artwork pack. A new item starts from an existing template rather than a blank file, and the producer can send the same pack to any printer without a redesign conversation.',
      'Retail listing artwork passed first time because label text, barcode placement and colour were resolved before the run, not after it.'
    ],
    reflection: {
      text: 'Consistency is not a style choice, it is a file-management problem. Solve the master artwork and the brand stops drifting.',
      attribution: 'TGNE design studio'
    },
    tools: ['Vector identity design', 'CMYK / Pantone proofing', 'Packaging artwork', 'Large-format print', 'Merchandise production']
  },
  {
    slug: 'fleet-vehicle-management',
    title: 'Keeping a working fleet on the road and on record',
    client: 'Distribution company · Tema',
    sector: 'Transport & logistics',
    group: 'Web & software',
    location: 'Tema, Ghana',
    year: '2025',
    duration: '10 weeks',
    featured: false,
    summary:
      'Service history lived in exercise books and fuel receipts in a drawer. We put every vehicle, driver, trip and maintenance event into one record the office can actually query.',
    intro:
      'A distribution business lives or dies by whether its vehicles are available. This one had a fleet it could not describe: no reliable service history, no clear picture of fuel spend per route, and insurance renewals discovered a week after they lapsed.',
    cover: {
      src: '/assets/tgne-collection/TGNE-Vehicle-Management-System.jpg',
      alt: 'Vehicle management system dashboard from the TGNE software portfolio'
    },
    services: ['Web & app development', 'ICT solutions & hardware'],
    metrics: [
      { value: '1', label: 'Record per vehicle', note: 'History, documents and cost together' },
      { value: '3', label: 'Renewal alerts', note: 'Insurance, roadworthiness, service' },
      { value: 'Daily', label: 'Trip capture', note: 'Entered at the desk, not from memory' }
    ],
    challenge: [
      'Maintenance was reactive. A vehicle went down, someone found an exercise book, and the office tried to remember what had been replaced last time.',
      'Cost per route was unknown because fuel, driver allowances and repairs were recorded in three places that never met.'
    ],
    approach: [
      {
        title: 'Start with the register',
        copy: 'Every vehicle got a single record holding its documents, assignment history, service events and running cost. Nothing clever — just complete, and in one place.'
      },
      {
        title: 'Capture at the point it happens',
        copy: 'Trip and fuel entry happens at the desk when the driver returns, with a short form that takes under a minute. Data collected later is data collected wrongly.'
      },
      {
        title: 'Let the system remember deadlines',
        copy: 'Insurance, roadworthiness and scheduled service dates generate advance alerts to named staff, so renewals stop being a surprise.'
      },
      {
        title: 'Report on cost, not activity',
        copy: 'The office view answers what a route costs to run and which vehicle is becoming expensive to keep, rather than simply listing what happened.'
      }
    ],
    delivered: [
      'Vehicle register with documents, assignments and full service history',
      'Driver records and trip logging with fuel and allowance capture',
      'Maintenance scheduling with advance renewal alerts',
      'Cost reporting per vehicle and per route',
      'Desk training for the operations team and a printed quick-reference card',
      'Hosting, backup schedule and a documented recovery procedure'
    ],
    outcome: [
      'The operations team can now answer availability and cost questions from the screen instead of from memory. Renewal alerts reach a named person ahead of the deadline.',
      'Service history is attached to the vehicle rather than to whoever last worked on it, so a decision to repair or retire is made against evidence.'
    ],
    reflection: {
      text: 'The hardest part was not the software. It was getting a form short enough that a tired driver would actually fill it in.',
      attribution: 'TGNE delivery team'
    },
    tools: ['Next.js', 'Relational data modelling', 'Scheduled alerts', 'Operational reporting', 'Managed hosting']
  },
  {
    slug: 'school-library-management',
    title: 'A school library that knows where every book is',
    client: 'Private basic school · Greater Accra',
    sector: 'Education',
    group: 'Education',
    location: 'Tema, Ghana',
    year: '2025',
    duration: '8 weeks',
    featured: false,
    summary:
      'Cataloguing, lending and overdue tracking were manual and inconsistent. We digitised the collection and gave the librarian a desk tool that runs the whole cycle.',
    intro:
      'The school had a real collection and one librarian. Books were catalogued in a ledger, lending was recorded on cards, and overdue titles were chased by walking the classrooms. Stocktaking meant closing the library for a week.',
    cover: {
      src: '/assets/tgne-collection/TGNE-Library-Management-System-Display.jpg',
      alt: 'Library management system display from the TGNE education software portfolio'
    },
    services: ['Web & app development', 'ICT solutions & hardware', 'ICT education consultancy'],
    metrics: [
      { value: '1', label: 'Catalogue record per title', note: 'Searchable by title, author, subject' },
      { value: '2', label: 'Scans per loan', note: 'Book and borrower card' },
      { value: 'Live', label: 'Overdue list', note: 'No classroom walk required' }
    ],
    challenge: [
      'The ledger could not answer simple questions: is this title in stock, who has it, and when is it due. Duplicate purchases happened because nobody could see what was already on the shelf.',
      'The librarian was the only person who understood the system, which made the library fragile whenever she was unavailable.'
    ],
    approach: [
      {
        title: 'Catalogue once, properly',
        copy: 'We worked through the collection with the librarian, assigning a consistent record per title and a scannable label per copy. Slow, unglamorous, and the reason everything afterwards works.'
      },
      {
        title: 'Make lending two scans',
        copy: 'Book label and borrower card. If a transaction takes longer than that, it will not be recorded during a busy break period.'
      },
      {
        title: 'Surface what needs chasing',
        copy: 'A live overdue list grouped by class, printable as a single sheet a teacher can act on, replaced the classroom walk.'
      },
      {
        title: 'Train a second person',
        copy: 'A deputy librarian and two student prefects were trained on daily operations, with a short written guide for each task.'
      }
    ],
    delivered: [
      'Digitised catalogue with copy-level labels and search',
      'Borrower records linked to class and guardian contact',
      'Scan-based lending, returns and renewals',
      'Live overdue reporting grouped by class, with printable chase sheets',
      'Stocktake mode and acquisition reporting to prevent duplicate purchases',
      'Librarian and deputy training with task-level written guides',
      'Workstation setup, backup schedule and offline-tolerant operation'
    ],
    outcome: [
      'Lending is recorded at the point it happens, so the catalogue reflects the shelf. The overdue list is generated rather than assembled, and stocktaking no longer requires closing the library.',
      'Three people can now run daily operations. Acquisition decisions are made against a report of what the collection already holds.'
    ],
    reflection: {
      text: 'A library system succeeds or fails during the cataloguing, long before anyone sees a screen. We budgeted most of the project for that work.',
      attribution: 'TGNE delivery team'
    },
    tools: ['Catalogue data migration', 'Barcode labelling', 'Lending workflows', 'Class-level reporting', 'Staff training']
  },
  {
    slug: 'website-and-hosting-launch',
    title: 'A website that works on the networks people actually use',
    client: 'Service business · Tema',
    sector: 'Small business',
    group: 'ICT & infrastructure',
    location: 'Tema, Ghana',
    year: '2024',
    duration: '5 weeks',
    featured: false,
    summary:
      'The business had a Facebook page and no website. We built a fast, mobile-first site on managed hosting with domain email and a contact route that reaches a phone.',
    intro:
      'Customers were finding the business on social media and then asking for a website to check it was real. There was none. Enquiries arrived as comments and direct messages, and half of them were lost in the thread.',
    cover: {
      src: '/assets/tgne-collection/TGNE-Website-and-Mobile-App-Development.jpg',
      alt: 'Website and mobile app development work from the TGNE digital portfolio'
    },
    services: ['Web & app development', 'Hosting & web domains', 'Graphic design & branding'],
    metrics: [
      { value: 'Mobile', label: 'First', note: 'Designed on a phone, then widened' },
      { value: '1 tap', label: 'To contact', note: 'Call and WhatsApp from every page' },
      { value: 'Own', label: 'Domain & email', note: 'No more free-mail addresses' }
    ],
    challenge: [
      'Most visitors arrive on mobile data, often on a mid-range Android device. A heavy template with autoplay video and a slider full of large images would have lost them before the first paragraph.',
      'The business also needed to look established: a proper domain, matching email addresses and consistent branding across the site and social profiles.'
    ],
    approach: [
      {
        title: 'Design for the slowest likely visit',
        copy: 'We set a weight budget before designing, compressed and correctly sized every image, and cut anything that did not help a visitor decide to make contact.'
      },
      {
        title: 'Make contact impossible to miss',
        copy: 'Call and WhatsApp actions sit in the header and repeat at every decision point. An enquiry should never require hunting for a phone number.'
      },
      {
        title: 'Own the foundations',
        copy: 'Domain registration, managed hosting, SSL and domain-based email were set up together, with renewal dates recorded and handed over in writing.'
      },
      {
        title: 'Hand over something maintainable',
        copy: 'The owner was trained to update services, prices and photos without calling us, and given a one-page guide covering the tasks they would actually do.'
      }
    ],
    delivered: [
      'Mobile-first marketing site with services, gallery, FAQ and contact pages',
      'Persistent call and WhatsApp contact actions',
      'Enquiry form routed to the business inbox with confirmation to the sender',
      'Domain registration, managed hosting, SSL and domain email',
      'Social profile branding aligned to the site identity',
      'Search and social sharing metadata with a branded preview image',
      'Owner training and a written maintenance guide'
    ],
    outcome: [
      'Enquiries now arrive through a form and a tap-to-call route rather than scattered social threads, and each one reaches an inbox the business checks daily.',
      'The site stays usable on a modest mobile connection because the weight budget was treated as a requirement, not an optimisation to do later.'
    ],
    reflection: {
      text: 'On mobile data, performance is not a technical metric. It is whether the customer stays long enough to read what you do.',
      attribution: 'TGNE web team'
    },
    tools: ['Next.js', 'Managed hosting', 'Domain & email setup', 'Image optimisation', 'Secure enquiry forms']
  }
];

export function getCaseStudy(slug) {
  return TGNE_CASE_STUDIES.find((study) => study.slug === slug) || null;
}

export function getFeaturedCaseStudies(limit = 3) {
  const featured = TGNE_CASE_STUDIES.filter((study) => study.featured);
  return (featured.length ? featured : TGNE_CASE_STUDIES).slice(0, limit);
}

export function getRelatedCaseStudies(slug, limit = 3) {
  const current = getCaseStudy(slug);
  if (!current) return TGNE_CASE_STUDIES.slice(0, limit);
  const sameGroup = TGNE_CASE_STUDIES.filter((study) => study.slug !== slug && study.group === current.group);
  const others = TGNE_CASE_STUDIES.filter((study) => study.slug !== slug && study.group !== current.group);
  return [...sameGroup, ...others].slice(0, limit);
}

export function getCaseStudyNeighbours(slug) {
  const index = TGNE_CASE_STUDIES.findIndex((study) => study.slug === slug);
  if (index < 0) return { previous: null, next: null };
  return {
    previous: TGNE_CASE_STUDIES[index - 1] || TGNE_CASE_STUDIES[TGNE_CASE_STUDIES.length - 1],
    next: TGNE_CASE_STUDIES[index + 1] || TGNE_CASE_STUDIES[0]
  };
}