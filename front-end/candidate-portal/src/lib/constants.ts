import type { TFunction } from "i18next";
export const LandingPageContent = (t: TFunction)=>[
  {
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=2850",
    title: t('landing.dreamJob'),
    description: t('landing.dreamJobDescription'),
  },
  {
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=2850",
    title: t('landing.buildCareer'),
    description: t('landing.buildCareerDescription'),
  },
  {
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=2850",
    title: t('landing.growConfidence'),
    description: t('landing.growConfidenceDescription'),
  },
]
