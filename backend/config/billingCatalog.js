// Amounts are in paise. Both the public pricing UI and checkout use this catalog.
module.exports = [
  { id: 1, name: 'free', title: 'Free', monthly: 0, annual: 0, tagline: 'Find your starting point', features: ['Career workspace and application tracking', 'Resume and cover letter tools', '5 daily AI requests on standard models', 'Explore the workspace before upgrading'] },
  { id: 2, name: 'plus', title: 'Plus', monthly: 14900, annual: 142800, tagline: 'Build momentum in your search', features: ['Everything in Free', '10 daily AI requests on standard models', 'More resume and cover letter generations', 'Mock interview practice'] },
  { id: 3, name: 'pro', title: 'Pro', monthly: 29900, annual: 286800, tagline: 'Go deeper with your preparation', features: ['Everything in Plus', 'Up to 20 daily AI requests, depending on model', 'Access to the Pro AI model', 'Expanded monthly preparation limits'] },
];
