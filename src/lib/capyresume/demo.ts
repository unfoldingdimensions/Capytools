/**
 * CapyResume — the demo résumé.
 *
 * Shown in the idle state so the tool teaches by example instead of opening on a
 * blank page. Entirely fictional, entirely client-side.
 */

import type { ResumeDoc } from './types';
import { RESUME_SCHEMA_VERSION } from './types';

export const DEMO_RESUME: ResumeDoc = {
  version: RESUME_SCHEMA_VERSION,
  templateId: 'classic',
  updatedAt: '2026-01-01T00:00:00.000Z',
  contact: {
    name: 'Maya Okafor',
    email: 'maya.okafor@example.com',
    phone: '+61 400 000 000',
    location: 'Melbourne, Australia',
    links: [
      { label: 'LinkedIn', url: 'linkedin.com/in/mayaokafor' },
      { label: 'Portfolio', url: 'mayaokafor.example.com' },
    ],
  },
  sections: [
    {
      id: 'demo-summary',
      type: 'summary',
      title: 'Summary',
      entries: [
        {
          id: 'demo-summary-entry',
          text: 'Operations analyst with five years turning messy spreadsheets into decisions. I build the reporting people actually use, and I have cut month-end close from nine days to four at two companies.',
          bullets: [],
          tags: [],
        },
      ],
    },
    {
      id: 'demo-experience',
      type: 'experience',
      title: 'Experience',
      entries: [
        {
          id: 'demo-exp-1',
          title: 'Senior Operations Analyst',
          organisation: 'Northwind Logistics',
          location: 'Melbourne, VIC',
          startDate: '2022-03',
          current: true,
          bullets: [
            {
              id: 'demo-exp-1-b1',
              text: 'Rebuilt the monthly close process, cutting it from nine days to four.',
            },
            {
              id: 'demo-exp-1-b2',
              text: 'Built a demand forecast used by three regional teams to plan 1,200 weekly deliveries.',
            },
            {
              id: 'demo-exp-1-b3',
              text: 'Trained eight colleagues on the new reporting stack, removing a single-person dependency.',
            },
          ],
          tags: [],
        },
        {
          id: 'demo-exp-2',
          title: 'Operations Analyst',
          organisation: 'Harbour Freight Co.',
          location: 'Geelong, VIC',
          startDate: '2019-07',
          endDate: '2022-02',
          bullets: [
            {
              id: 'demo-exp-2-b1',
              text: 'Automated the weekly KPI pack, saving six hours of manual work per week.',
            },
            {
              id: 'demo-exp-2-b2',
              text: 'Identified a routing inefficiency that reduced fuel spend by 11% year on year.',
            },
          ],
          tags: [],
        },
      ],
    },
    {
      id: 'demo-education',
      type: 'education',
      title: 'Education',
      entries: [
        {
          id: 'demo-edu-1',
          title: 'Bachelor of Commerce, Economics',
          organisation: 'University of Melbourne',
          location: 'Melbourne, VIC',
          startDate: '2015',
          endDate: '2018',
          bullets: [],
          tags: [],
        },
      ],
    },
    {
      id: 'demo-skills',
      type: 'skills',
      title: 'Skills',
      entries: [
        {
          id: 'demo-skills-1',
          bullets: [],
          tags: [
            'SQL',
            'Python (pandas)',
            'Excel modelling',
            'Power BI',
            'Stakeholder reporting',
            'Process design',
          ],
        },
      ],
    },
    {
      id: 'demo-projects',
      type: 'projects',
      title: 'Projects',
      entries: [
        {
          id: 'demo-project-1',
          title: 'Open transit-delay dataset',
          bullets: [
            {
              id: 'demo-project-1-b1',
              text: 'Published a cleaned ten-year dataset of metropolitan rail delays, used by two university courses.',
            },
          ],
          tags: ['Python', 'Data cleaning'],
        },
      ],
    },
    {
      id: 'demo-certifications',
      type: 'certifications',
      title: 'Certifications',
      entries: [
        {
          id: 'demo-cert-1',
          title: 'Google Data Analytics Professional Certificate',
          organisation: 'Google',
          startDate: '2021-05',
          bullets: [],
          tags: [],
        },
      ],
    },
  ],
};
