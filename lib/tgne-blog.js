export const BLOG_CATEGORIES = ['All posts', 'Technology', 'Design & print', 'ICT education', 'Business'];

const POSTS = [
  {
    slug: 'what-a-small-business-website-in-ghana-needs',
    title: 'What a small business website in Ghana actually needs',
    dek: 'Most visitors arrive on mobile data, in a hurry, deciding whether to trust you. Five requirements matter more than the design theme.',
    category: 'Business',
    date: '2026-10-28',
    author: 'TGNE Solutions',
    featured: true,
    cover: {
      src: '/assets/tgne-collection/TGNE-Digital-Solutions-and-Website-Promotion.jpg',
      alt: 'Website and digital solutions promotion artwork from the TGNE portfolio'
    },
    tags: ['Web development', 'Mobile data', 'Small business', 'Hosting'],
    body: [
      { type: 'p', text: 'A website for a Ghanaian small business is not a brochure. It is the thing a customer opens after finding you on Facebook, WhatsApp or a referral, while standing somewhere with patchy signal, deciding in about eight seconds whether you are real.' },
      { type: 'p', text: 'That framing changes the priorities. Here is what we build to, in the order it matters.' },
      { type: 'h2', text: '1. It has to load on mobile data' },
      { type: 'p', text: 'The typical visitor is on a mid-range Android phone, on a prepaid bundle, possibly on 3G. A template with autoplay video, three font families and a slider of two-megabyte images will lose that person before your first paragraph renders.' },
      { type: 'p', text: 'Set a weight budget before you design anything. Compress and correctly size every image, serve modern formats, and remove anything that does not help a visitor decide to contact you. Performance here is not a technical metric — it is whether the customer stays long enough to read what you do.' },
      { type: 'list', items: [
        'Size images for the slot they occupy, never upload a full-resolution photo and shrink it with CSS.',
        'Use one font family with two weights rather than four families.',
        'Avoid autoplay video on the landing view. A still image with a play button costs almost nothing.',
        'Test on a real phone on mobile data, not only on office Wi-Fi.'
      ] },
      { type: 'h2', text: '2. Contact must be one tap away' },
      { type: 'p', text: 'In this market, a great deal of business closes on WhatsApp or a phone call. If a visitor has to scroll to the footer to find your number, you have lost them.' },
      { type: 'p', text: 'Put tap-to-call and WhatsApp actions in the header and repeat them at every decision point: after the services list, after the gallery, after the FAQ. An enquiry form is useful for detail, but it should never be the only route.' },
      { type: 'callout', title: 'A simple test', text: 'Hand your phone to someone who has not seen the site. Ask them to contact you. If it takes more than one tap and a few seconds, the contact path is wrong.' },
      { type: 'h2', text: '3. Say what you do, where, and for whom' },
      { type: 'p', text: '“Innovative solutions for a changing world” tells a visitor nothing. “Branded printing and ICT support for schools and businesses in Tema” tells them whether to keep reading.' },
      { type: 'p', text: 'Name your services in the language customers use, name your location, and show real work. A gallery of actual output beats a stock photo of a handshake every time.' },
      { type: 'h2', text: '4. Own the domain and the email' },
      { type: 'p', text: 'A free-mail address on a quotation undermines everything else on the site. Register the domain, set up email on it, and use it consistently on invoices, cards and social profiles.' },
      { type: 'p', text: 'Record the renewal dates and hand them to someone who will still be at the business in two years. An expired domain is a genuinely expensive way to lose customers who already found you.' },
      { type: 'h2', text: '5. Make it maintainable by the owner' },
      { type: 'p', text: 'Prices change. Services change. Photos get better. If every edit requires a developer, the site slowly stops being true, and a site that is not true is worse than no site.' },
      { type: 'p', text: 'Whoever builds it should hand over a one-page guide covering the handful of tasks the owner will actually do, and train them once on a real change rather than a demo.' },
      { type: 'quote', text: 'The best small business website is the one that is still accurate eighteen months after launch.', cite: 'TGNE web team' },
      { type: 'h2', text: 'What you can safely skip' },
      { type: 'p', text: 'A blog you will not update. An account system nobody asked for. A chatbot that cannot answer anything useful. Elaborate animation that delays the content. Start with the five requirements above, get them right, and add more only when a customer asks for it.' }
    ]
  },
  {
    slug: 'shared-hosting-or-a-vps',
    title: 'Shared hosting or a VPS: choosing without overbuying',
    dek: 'The honest answer depends on what runs on the server, who maintains it, and what happens on the day it breaks.',
    category: 'Technology',
    date: '2026-10-14',
    author: 'TGNE Solutions',
    featured: false,
    cover: {
      src: '/assets/tgne-collection/TGNE-Technology-and-Software-Solutions.jpg',
      alt: 'Technology and software solutions artwork from the TGNE portfolio'
    },
    tags: ['Hosting', 'Infrastructure', 'Domains', 'Maintenance'],
    body: [
      { type: 'p', text: 'Hosting conversations usually start with price and end with confusion. The comparison that actually matters is not monthly cost — it is who is responsible when something goes wrong at 7pm on a Friday.' },
      { type: 'h2', text: 'What shared hosting is good at' },
      { type: 'p', text: 'Shared hosting puts your site on a server alongside many others, with the provider handling the operating system, the web server, security patching and usually email. You manage your files and your application.' },
      { type: 'p', text: 'For a brochure site, a small business site, a portfolio or a WordPress install with modest traffic, this is the right answer most of the time. It is inexpensive, it is maintained by someone else, and the control panel lets a non-technical owner do routine tasks.' },
      { type: 'list', items: [
        'Predictable cost, usually billed annually.',
        'Provider handles patching, backups and server uptime.',
        'Email hosting commonly included on the same domain.',
        'Limited control: you cannot install arbitrary services or change server configuration.'
      ] },
      { type: 'h2', text: 'What a VPS gives you, and what it costs you' },
      { type: 'p', text: 'A virtual private server is your own machine. You choose the operating system, install what you need, and configure it how you like. That freedom is the entire point — and the entire responsibility.' },
      { type: 'p', text: 'Nobody patches it for you. Nobody notices the disk filling up. Nobody restores it after a bad update unless you have set that up and tested it. A VPS is cheaper than managed hosting only if you already have someone competent looking after it.' },
      { type: 'callout', title: 'The real question', text: 'Do you have a named person who will apply security updates, watch resource usage and perform a restore? If the answer is no, a VPS is not the cheaper option. It is the riskier one.' },
      { type: 'h2', text: 'Where a VPS or managed platform genuinely wins' },
      { type: 'p', text: 'Custom applications with a database and background jobs, Node or Python services, anything needing specific server configuration, or workloads that have outgrown shared resource limits. Modern managed platforms sit between the two: you deploy application code and the provider runs the infrastructure.' },
      { type: 'p', text: 'For a Next.js application with a Postgres database, a managed platform is usually a better fit than either traditional shared hosting or a hand-run VPS. You get deploys, environment variables and a managed database without becoming a system administrator.' },
      { type: 'h2', text: 'Decide in this order' },
      { type: 'list', items: [
        'What runs on it? Static or PHP brochure site points to shared hosting. A custom application points to a managed platform or VPS.',
        'Who maintains it? No named maintainer means choose the option where maintenance is included.',
        'What is the cost of an hour offline? Higher cost justifies paying for monitoring and support.',
        'Where are your users? Choose a region close to them, and check whether the provider has a sensible path for Ghanaian traffic.',
        'How does it end? Confirm you can export your files, database and domain before you commit.'
      ] },
      { type: 'h2', text: 'Regardless of which you pick' },
      { type: 'p', text: 'Keep the domain registered in your own name, not the developer’s. Keep a backup that lives somewhere other than the hosting account. Write down the renewal dates. And test a restore once — an untested backup is a hope, not a plan.' },
      { type: 'quote', text: 'Buy the hosting you can maintain, not the hosting you can afford on paper.', cite: 'TGNE infrastructure team' }
    ]
  },
  {
    slug: 'print-ready-brand-checklist',
    title: 'The print-ready brand checklist',
    dek: 'Most brand drift is not a design problem. It is a file problem. Nine checks that stop colour shifts, fuzzy logos and expensive reprints.',
    category: 'Design & print',
    date: '2026-09-30',
    author: 'TGNE Solutions',
    featured: false,
    cover: {
      src: '/assets/tgne-collection/TGNE-Printing-and-Branding-Portfolio.jpg',
      alt: 'Printing and branding portfolio spread produced by TGNE'
    },
    tags: ['Branding', 'Print production', 'Colour management', 'Packaging'],
    body: [
      { type: 'p', text: 'When a brand looks different on the jar than it does on the business card, the usual explanation is that someone “changed the design”. More often, nobody changed anything — the artwork was rebuilt from a screenshot, the colour was guessed from a phone, and the printer did their best with what arrived.' },
      { type: 'p', text: 'These are the checks we run before any production job leaves the studio.' },
      { type: 'h2', text: 'Artwork' },
      { type: 'list', items: [
        'The logo is a vector master file, not a redrawn JPEG. It should scale to a billboard and a pen without degradation.',
        'Clear space and minimum size are defined, so a supplier cannot crowd the mark into a corner.',
        'A monochrome and a reversed version exist. If they do not, someone will invent them badly.',
        'All text in print artwork is either outlined or the font files are supplied and licensed for the use.'
      ] },
      { type: 'h2', text: 'Colour' },
      { type: 'p', text: 'Screen colour and printed colour are different systems. RGB is light; CMYK is ink. A vivid screen blue frequently prints duller and greyer, and no amount of arguing with the printer changes that.' },
      { type: 'list', items: [
        'Every brand colour has a CMYK value for process printing and an RGB value for screens.',
        'Where colour accuracy matters commercially, specify a Pantone reference and pay for the spot colour.',
        'Keep a printed proof sheet. Hand it to any new printer rather than describing the colour in words.',
        'Approve a physical proof on the actual stock before the full run, and look at it under the lighting where it will be seen.'
      ] },
      { type: 'callout', title: 'The expensive mistake', text: 'Approving colour on a phone screen, then discovering the shift after five hundred labels are printed. A proof costs a fraction of a reprint.' },
      { type: 'h2', text: 'Layout and production' },
      { type: 'list', items: [
        'Bleed is included — typically 3mm beyond trim on each edge — for anything with colour reaching the edge.',
        'Critical text and logos sit inside a safe margin, well away from the trim line.',
        'Images are 300dpi at the size they will actually print. Upscaling a web image does not add detail.',
        'Barcodes are vector, correctly sized, and placed where a scanner can reach them on the finished pack.',
        'The finish is specified: stock weight, lamination, foil, emboss, die-cut. “Nice paper” is not a specification.'
      ] },
      { type: 'h2', text: 'Legal and label text' },
      { type: 'p', text: 'For food, cosmetic and regulated products, label content is not a design decision. Ingredients, net weight, batch coding, manufacturer details and any required certifications should come from the client in writing and be proofread separately from the layout.' },
      { type: 'p', text: 'Re-typing that text for each new print run is how errors get in. Keep one approved copy document and pull from it every time.' },
      { type: 'h2', text: 'Handover' },
      { type: 'p', text: 'The deliverable is not a folder of JPEGs. It is an artwork pack: editable masters, print-ready PDFs with bleed and trim marks, a brand sheet with colour values, and a short note telling a supplier what stock and finish you expect.' },
      { type: 'quote', text: 'Consistency is a file-management problem. Solve the master artwork and the brand stops drifting.', cite: 'TGNE design studio' }
    ]
  },
  {
    slug: 'why-ict-training-does-not-stick',
    title: 'Why ICT training does not stick, and what does',
    dek: 'Attendance is not capability. The difference comes down to what happens in the six weeks after the workshop ends.',
    category: 'ICT education',
    date: '2026-09-16',
    author: 'TGNE Solutions',
    featured: false,
    cover: {
      src: '/assets/tgne-collection/TGNE-AI-Training-and-Education-Promotion.jpg',
      alt: 'AI training and education promotion artwork from the TGNE portfolio'
    },
    tags: ['ICT education', 'Training', 'Schools', 'Change management'],
    body: [
      { type: 'p', text: 'Organisations buy training, run the workshop, take a group photograph, and six weeks later nothing has changed. The conclusion is usually that staff were not interested. The conclusion is almost always wrong.' },
      { type: 'h2', text: 'The three reasons it fails' },
      { type: 'p', text: 'First, the training was generic. A course on “Microsoft Office” teaches features. Staff need to produce the specific report, invoice or register their job actually requires, and a feature tour does not get them there.' },
      { type: 'p', text: 'Second, there was no immediate use. Skills decay fast without application. If a learner returns to a desk where the old process is still the only permitted process, the new skill has nowhere to live.' },
      { type: 'p', text: 'Third, nobody could fix anything. The moment a machine behaves unexpectedly, an unconfident user stops entirely rather than troubleshooting. Confidence with the recovery path matters more than confidence with the happy path.' },
      { type: 'h2', text: 'What we do instead' },
      { type: 'list', items: [
        'Build the curriculum from the organisation’s real documents. Learners produce their actual register, report or invoice during the session.',
        'Train on the machines and the network they will use afterwards, not on better hardware in a different room.',
        'Teach the failure paths explicitly: what to do when the file will not open, the printer is offline, the password is forgotten.',
        'Assess with an observable practical task rather than a written test about software.',
        'Leave a written runbook in plain language, with one page per task.'
      ] },
      { type: 'h2', text: 'Train a second person, always' },
      { type: 'p', text: 'The single most common structural failure in a small office or a school lab is one person who knows how everything works. When they are absent, the facility closes.' },
      { type: 'p', text: 'Every engagement should end with at least two people able to run daily operations independently, and ideally a third who can cover. This costs a little more at the time and saves the entire investment later.' },
      { type: 'callout', title: 'A useful measure', text: 'Do not count attendees. Count how many people can complete the core task alone, without asking, three weeks after the training ended.' },
      { type: 'h2', text: 'The six weeks afterwards' },
      { type: 'p', text: 'Schedule a follow-up session before the training ends, not after you notice a problem. Use it to look at what learners actually produced, answer the questions they were embarrassed to ask in the room, and correct the runbook where reality diverged from the plan.' },
      { type: 'p', text: 'For schools, tie the follow-up to the term calendar so it lands while the equipment is still in use. For offices, tie it to a reporting cycle so there is real work to review.' },
      { type: 'h2', text: 'What certificates should mean' },
      { type: 'p', text: 'A certificate of attendance records that someone was in a room. A certificate of competence records that they produced work to a standard. If you are going to issue certificates — and they matter to learners and to employers — assess the second thing.' },
      { type: 'quote', text: 'Training only sticks when the people delivering it can also fix it. We spend as much time on the runbook as on the software.', cite: 'TGNE education consultancy' }
    ]
  },
  {
    slug: 'practical-ai-for-a-small-office',
    title: 'Practical AI for a small office, without the hype',
    dek: 'Four uses that save real hours in a Ghanaian SME, the checks each one needs, and the things worth leaving alone for now.',
    category: 'Technology',
    date: '2026-08-26',
    author: 'TGNE Solutions',
    featured: false,
    cover: {
      src: '/assets/tgne-collection/TGNE-Digital-Product-and-Software-Services.jpg',
      alt: 'Digital product and software services artwork from the TGNE portfolio'
    },
    tags: ['AI', 'Productivity', 'Small business', 'Data privacy'],
    body: [
      { type: 'p', text: 'Most AI advice aimed at small businesses is either a sales pitch or a list of things that require a data team. Neither is useful when you have eight staff, a shared inbox and a deadline on Friday.' },
      { type: 'p', text: 'Here is where the tools genuinely earn their place in an office like that — and where they do not.' },
      { type: 'h2', text: '1. Drafting the writing you already do' },
      { type: 'p', text: 'Quotation cover notes, follow-up emails, service descriptions, social captions, job adverts, policy first drafts. This is the strongest use case because you already know what good looks like, so you can judge the output in seconds.' },
      { type: 'p', text: 'Give it your actual context: the client, the job, the tone, the length. “Write a follow-up email” produces nothing useful. “Write a short, warm follow-up to a school that received our printing quote ten days ago, asking whether they need a revised quantity” produces something you can send after one edit.' },
      { type: 'h2', text: '2. Summarising what you have not read' },
      { type: 'p', text: 'Long supplier documents, tender requirements, meeting notes, a thread that grew to forty replies. Ask for the decisions, the deadlines and the actions owed by you specifically.' },
      { type: 'callout', title: 'The check that matters', text: 'A summary can omit the one clause that changes everything. Use it to decide what to read closely, never as a substitute for reading a contract you are about to sign.' },
      { type: 'h2', text: '3. Turning messy records into structure' },
      { type: 'p', text: 'A photographed list of stock, a handwritten register, a pile of receipts, notes from a site visit. These tools are genuinely good at extracting fields into a table you can then verify and import.' },
      { type: 'p', text: 'Verify every number. Transcription of amounts, dates and quantities is exactly where errors are both likely and consequential.' },
      { type: 'h2', text: '4. Explaining and troubleshooting' },
      { type: 'p', text: '“What does this error mean”, “how do I do this in the spreadsheet”, “explain this regulation in plain language”. A patient explanation available at the moment of confusion is worth more than a workshop six months ago.' },
      { type: 'h2', text: 'What to leave alone for now' },
      { type: 'list', items: [
        'Customer-facing chat that can invent prices, stock availability or commitments. Keep a human on anything that creates an obligation.',
        'Final artwork and legal documents. Use it for drafts and direction, not for the file that goes to print or to a lawyer.',
        'Anything involving client personal data pasted into a consumer tool. Check what the service does with your input before you paste.',
        'Automated decisions about people — hiring, credit, discipline. The error cost is far too high.'
      ] },
      { type: 'h2', text: 'A simple office policy' },
      { type: 'p', text: 'Write three sentences and share them with the team: what these tools may be used for, what must never be pasted in, and who checks output before it leaves the business. That is enough to capture most of the benefit without most of the risk.' },
      { type: 'p', text: 'Then pick one recurring task, measure how long it takes now, and try the tool on it for two weeks. If it does not save time, drop it and try a different task. The goal is hours recovered, not novelty adopted.' },
      { type: 'quote', text: 'The useful question is never “can AI do this?” It is “does this save us time on something we already do every week?”', cite: 'TGNE Solutions' }
    ]
  },
  {
    slug: 'domain-email-and-credibility',
    title: 'Your domain, your email, your credibility',
    dek: 'A free-mail address on a quotation quietly costs you work. What to set up, what it costs, and what to never hand to a third party.',
    category: 'Business',
    date: '2026-08-05',
    author: 'TGNE Solutions',
    featured: false,
    cover: {
      src: '/assets/tgne-collection/TGNE-Branded-Business-Cards-and-Print.jpg',
      alt: 'Branded business cards and print collateral produced by TGNE'
    },
    tags: ['Domains', 'Email', 'Branding', 'Trust'],
    body: [
      { type: 'p', text: 'Two quotations land in a client’s inbox. Identical price, identical scope. One comes from accounts@yourbusiness.com, the other from yourbusiness2019@gmail.com. The decision is not rational, but it is real, and it happens every day.' },
      { type: 'h2', text: 'What a domain actually buys you' },
      { type: 'p', text: 'A domain is an address you control. It gives you a website, email that matches your brand, and — importantly — something that survives a change of supplier. Your hosting can change, your developer can change, your email provider can change. The domain stays yours.' },
      { type: 'p', text: 'That last point is the one businesses discover too late. If the domain is registered in a developer’s personal account, you do not own your address. You are renting it from someone who may stop answering the phone.' },
      { type: 'callout', title: 'Non-negotiable', text: 'Register the domain in the business’s own name, with an email address the business controls, and keep the login details in the business’s own password store. Never in a supplier’s personal account.' },
      { type: 'h2', text: 'Choosing the name' },
      { type: 'list', items: [
        'Prefer the exact business name. If it is taken, add a sensible qualifier rather than a hyphen or a number.',
        '.com is the default expectation. A .com.gh signals a Ghanaian entity and can help with local trust and local search.',
        'Say it out loud. If it needs spelling every time you say it on the phone, it will be mistyped.',
        'Check the matching social handles before you commit, so the brand is consistent everywhere.',
        'Register for multiple years and turn on auto-renew. Expiry is the most common way small businesses lose a domain.'
      ] },
      { type: 'h2', text: 'Setting up email properly' },
      { type: 'p', text: 'Domain email is inexpensive and does not require running a mail server. A hosted mailbox service handles delivery, spam filtering and uptime; you point your domain’s MX records at it and create the accounts you need.' },
      { type: 'p', text: 'Three records make the difference between landing in the inbox and landing in spam:' },
      { type: 'list', items: [
        'SPF — declares which servers may send mail for your domain.',
        'DKIM — cryptographically signs outgoing messages so receivers can verify them.',
        'DMARC — tells receivers what to do with mail that fails those checks, and sends you reports.'
      ] },
      { type: 'p', text: 'Any competent provider will help you set these up. Ask for them explicitly; they are frequently skipped, and a business that skips them spends years wondering why quotations go to spam.' },
      { type: 'h2', text: 'Which addresses to create' },
      { type: 'p', text: 'Start small: a personal address for each person who deals with clients, plus one or two role addresses such as info@ and accounts@. Role addresses survive staff changes, which is exactly why they should exist alongside personal ones rather than instead of them.' },
      { type: 'p', text: 'Put the same addresses on the website, the business cards, the invoices and the email signature. Consistency across those four places is most of what “established” looks like to a customer.' },
      { type: 'h2', text: 'Keep a record' },
      { type: 'p', text: 'One page, stored where the business keeps its important documents: registrar and login, renewal date, hosting provider, email provider, and who to call. Review it annually. It takes ten minutes and prevents the two most expensive failures — an expired domain and mail nobody can access.' },
      { type: 'quote', text: 'An expired domain is a genuinely expensive way to lose customers who already found you.', cite: 'TGNE Solutions' }
    ]
  },
  {
    slug: 'backup-rule-for-schools-and-offices',
    title: 'The backup rule every school and small office should follow',
    dek: 'Three copies, two media, one offsite — and the restore test that tells you whether any of it is real.',
    category: 'ICT education',
    date: '2026-07-22',
    author: 'TGNE Solutions',
    featured: false,
    cover: {
      src: '/assets/tgne-collection/TGNE-Computer-and-Technology-Products.jpg',
      alt: 'Computer and technology products from the TGNE ICT portfolio'
    },
    tags: ['Backups', 'Data safety', 'Schools', 'ICT support'],
    body: [
      { type: 'p', text: 'Every organisation that has lost data says the same thing afterwards: we thought it was backed up. Usually something was being copied somewhere. What had never happened was a restore.' },
      { type: 'h2', text: 'The 3-2-1 rule' },
      { type: 'p', text: 'Three copies of anything you cannot afford to lose: the working original plus two backups. On two different kinds of storage, so a single failure mode does not take both. With one copy offsite, so a fire, a flood or a theft does not take all three.' },
      { type: 'p', text: 'For a school or a small office in Ghana, a workable version looks like this:' },
      { type: 'list', items: [
        'Copy one: the working files on the office machine or server.',
        'Copy two: an automated backup to a separate local drive or NAS, on a schedule, not whenever someone remembers.',
        'Copy three: an encrypted copy to cloud storage, or a drive that physically leaves the building each week.'
      ] },
      { type: 'h2', text: 'What actually needs backing up' },
      { type: 'p', text: 'People back up documents and forget everything else. The list that matters is longer:' },
      { type: 'list', items: [
        'Accounting data and the application that opens it — a backup you cannot read is not a backup.',
        'Student or client records, including the database behind any management system.',
        'Email, if it is stored locally rather than with a hosted provider.',
        'Design masters and artwork packs, which are expensive to recreate.',
        'Configuration: domain logins, licence keys, network settings, the runbook.',
        'Photos and evidence from field or site work.'
      ] },
      { type: 'callout', title: 'Ransomware changes the rule', text: 'If both backup copies are always connected to the same machine, encryption malware reaches them too. At least one copy must be offline or immutable — disconnected, or versioned cloud storage that cannot be overwritten in place.' },
      { type: 'h2', text: 'Automate it, then verify it' },
      { type: 'p', text: 'A backup that depends on a person remembering will fail during the busiest week of the year, which is exactly when you need it. Schedule it, and have it report success or failure to someone who reads the report.' },
      { type: 'p', text: 'Then check the logs monthly. Silent failure is the common case: the job stopped running after a password change or a drive letter moved, and nobody noticed for eight months.' },
      { type: 'h2', text: 'The restore test' },
      { type: 'p', text: 'Once a quarter, take a recent backup and restore it to a different machine. Open the files. Run the application. Confirm the records are complete and readable. Time how long it takes.' },
      { type: 'p', text: 'That number is your real recovery time, and it is usually much worse than expected. Knowing it lets you decide whether the arrangement is acceptable — and it is the only way to find out before you need it.' },
      { type: 'h2', text: 'Write down who does what' },
      { type: 'p', text: 'One page: what is backed up, how often, where the copies live, who checks the logs, who performs the quarterly restore, and where the credentials are stored. Name a second person. The plan should survive the absence of whoever set it up.' },
      { type: 'quote', text: 'An untested backup is a hope, not a plan.', cite: 'TGNE infrastructure team' }
    ]
  }
];

function blockText(block) {
  if (block.type === 'list') return block.items.join(' ');
  if (block.type === 'callout') return `${block.title} ${block.text}`;
  if (block.type === 'quote') return `${block.text} ${block.cite}`;
  return block.text || '';
}

function wordCount(post) {
  const words = `${post.title} ${post.dek} ${post.body.map(blockText).join(' ')}`.trim().split(/\s+/);
  return words.filter(Boolean).length;
}

export function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export const TGNE_BLOG_POSTS = POSTS.map((post) => ({
  ...post,
  readingMinutes: Math.max(2, Math.ceil(wordCount(post) / 200)),
  toc: post.body.filter((block) => block.type === 'h2').map((block) => ({ id: slugifyHeading(block.text), text: block.text }))
})).sort((a, b) => b.date.localeCompare(a.date));

export function formatPostDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

export function getBlogPost(slug) {
  return TGNE_BLOG_POSTS.find((post) => post.slug === slug) || null;
}

export function getFeaturedPost() {
  return TGNE_BLOG_POSTS.find((post) => post.featured) || TGNE_BLOG_POSTS[0];
}

export function getLatestPosts(limit = 3) {
  return TGNE_BLOG_POSTS.slice(0, limit);
}

export function getRelatedPosts(slug, limit = 3) {
  const current = getBlogPost(slug);
  if (!current) return TGNE_BLOG_POSTS.slice(0, limit);
  const sameCategory = TGNE_BLOG_POSTS.filter((post) => post.slug !== slug && post.category === current.category);
  const sharedTags = TGNE_BLOG_POSTS.filter(
    (post) => post.slug !== slug && post.category !== current.category && post.tags.some((tag) => current.tags.includes(tag))
  );
  const others = TGNE_BLOG_POSTS.filter(
    (post) => post.slug !== slug && !sameCategory.includes(post) && !sharedTags.includes(post)
  );
  return [...sameCategory, ...sharedTags, ...others].slice(0, limit);
}