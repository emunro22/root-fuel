// Blog content lives here as plain data so pages/blog/index.js and
// pages/blog/[slug].js can both read it without hitting a CMS. Add a new
// post by appending an object below; slug becomes the URL at /blog/<slug>.
export const blogPosts = [
  {
    slug: 'founders-story-whole-food-glasgow',
    title: "Why I Started Root & Fuel: A Glasgow Mum's Journey to Whole Food Nutrition",
    description:
      "Samantha's story of ADHD, IBS and endometriosis, and how whole, real food changed her health and led her to start Root & Fuel, a Glasgow meal prep and catering company.",
    date: '2026-01-12',
    readTime: '5 min read',
    tags: ['Founder Story', 'Gut Health', 'Glasgow'],
    image: '/food/dish3.jpg',
    content: [
      { type: 'p', text: "I'm Samantha, a mum of two based here in Glasgow, and I've had a lifelong love of cooking. But it wasn't until 2020 that food became something much deeper than just flavour for me." },
      { type: 'p', text: "That year I was diagnosed with ADHD, and I was also dealing with ongoing gut issues: IBS, endometriosis, chronic bloating and persistent stomach pain that no single explanation seemed to cover. It forced me to take a hard look at what I was actually putting into my body every day." },
      { type: 'h2', text: 'What I found was simple, but powerful' },
      { type: 'p', text: "The more I relied on overly processed foods, the worse I felt: physically, mentally and hormonally. So I started to change things, one ingredient at a time. Nothing drastic, just a steady shift towards food that was closer to how it grew." },
      { type: 'p', text: "When I had my first baby in 2021, I began focusing on whole, nourishing meals for my family. I kept a food diary, tracked how different ingredients made me feel, and slowly built a way of eating that supported not just my body, but my brain too. The difference was undeniable: more energy, better focus, less discomfort, and a completely different relationship with food." },
      { type: 'h2', text: 'From kitchen table to Glasgow meal prep' },
      { type: 'p', text: "Fast forward to 2025, and I was given the opportunity to step away from the corporate world and build something of my own, something that genuinely mattered. Root & Fuel is the result of that journey." },
      { type: 'p', text: "We're a small, family-run meal prep and catering business based in Glasgow, with a clear mission: make real, fresh, nourishing food more accessible for busy people, without compromising on quality, flavour or nutrition. Whether you're a busy parent, a corporate professional, or someone trying to fuel an active lifestyle, we want to bridge the gap between convenience and quality." },
      { type: 'p', text: "Nothing we do is overly complicated or pretentious. It's simply good food, made with intention. Because when you eat better, you feel better, and when you feel better, everything else starts to follow." },
      { type: 'p', text: "If any part of this sounds familiar, whether it's gut issues, low energy, or just not having time to cook properly, take a look at our menu. It's the food I wish I'd had delivered to my door back in 2020." },
    ],
  },
  {
    slug: 'gut-health-meal-prep-glasgow',
    title: 'Gut Health 101: Simple Whole-Food Swaps for Better Digestion',
    description:
      "Practical, no-nonsense whole-food swaps for IBS and bloating from someone who lives with it, plus how Glasgow meal prep can make the change easier to stick to.",
    date: '2026-02-03',
    readTime: '4 min read',
    tags: ['Gut Health', 'Nutrition Tips', 'Glasgow'],
    image: '/food/dish6.jpg',
    content: [
      { type: 'p', text: "Living with IBS taught me that gut health isn't fixed with one miracle ingredient. It's built from dozens of small, boring, repeatable choices. Here are the swaps that made the biggest difference for me, and that we build our menu around at Root & Fuel." },
      { type: 'h2', text: '1. Swap ultra-processed carbs for whole grains' },
      { type: 'p', text: "White bread and heavily refined cereals digest fast and can leave blood sugar, and energy, swinging all day. Whole grains like brown rice, oats and quinoa digest more slowly and bring fibre that feeds a healthier gut microbiome." },
      { type: 'h2', text: '2. Cook vegetables instead of relying only on raw' },
      { type: 'p', text: "Raw salads get a lot of the credit for 'healthy eating', but for a sensitive gut, lightly cooked vegetables are often easier to break down and less likely to trigger bloating than a big raw salad." },
      { type: 'h2', text: '3. Prioritise protein at every meal' },
      { type: 'p', text: "Protein slows digestion in a good way: it keeps you fuller for longer and helps stabilise energy, which matters a lot if ADHD or brain fog is part of your picture too, as it is for me." },
      { type: 'h2', text: "4. Cut back on ultra-processed 'convenience' food" },
      { type: 'p', text: "This is the one that actually matters most. It's not about any single food being 'bad'. It's the cumulative load of additives, emulsifiers and refined oils in heavily processed meals that tends to aggravate a sensitive gut over time." },
      { type: 'h2', text: 'Why meal prep helps more than willpower' },
      { type: 'p', text: "None of this requires perfection. It requires the healthier option to be the easy option. That's the whole idea behind Root & Fuel's Glasgow meal prep service: whole-food meals made from scratch and delivered to your door, so on a busy Tuesday the nourishing choice is also the fastest one." },
      { type: 'p', text: "If gut health is something you're navigating too, have a browse of our menu: every dish is built around real, whole ingredients, not shortcuts." },
    ],
  },
  {
    slug: 'high-protein-meal-prep-glasgow-professionals',
    title: 'High-Protein Meal Prep in Glasgow: Fuelling Busy Professionals and Athletes',
    description:
      "How to hit your protein targets without living in the kitchen, and why Glasgow professionals and gym-goers are turning to local meal prep delivery.",
    date: '2026-03-10',
    readTime: '4 min read',
    tags: ['Performance Nutrition', 'Meal Prep', 'Glasgow'],
    image: '/food/dish9.jpg',
    content: [
      { type: 'p', text: "'Performance nutrition, rooted in nature' isn't just a tagline for us. It's the standard we hold every dish to. And for a lot of our customers, that starts with a simple, stubborn problem: not enough hours in the day to cook high-protein meals from scratch." },
      { type: 'h2', text: 'The Glasgow problem: training hard, eating rushed' },
      { type: 'p', text: "Between corporate hours, commuting across the city and training sessions before or after work, protein is usually the first thing to slip, not because people don't know it matters, but because it's the most time-consuming macro to get right without planning." },
      { type: 'h2', text: 'What we build our menu around' },
      { type: 'p', text: "Every main on the Root & Fuel menu is designed around a solid protein base (lean meats, fish and plant proteins) paired with whole grains and vegetables, so a single dish does the job a protein shake and a rushed lunch used to do separately." },
      { type: 'h2', text: 'Meal prep as a training tool, not just a convenience' },
      { type: 'p', text: "We work with a number of local gyms and sports teams around Glasgow, supplying grab-and-go meals and full catering for events. The logic is the same whether it's one person prepping for the week or a whole team before a match: consistent, whole-food fuel beats inconsistent effort every time." },
      { type: 'h2', text: 'How it works' },
      { type: 'p', text: "We deliver on Tuesdays (order Wednesday to Saturday), straight to your door between 8am and 12pm, so your week starts with the fridge already stocked. If you're planning something bigger (a team, a corporate event, a private function), our catering service is built on the exact same whole-food principles." },
      { type: 'p', text: "Have a look at the Mains and Poke Bowls on our menu to see what a properly fuelled week in Glasgow can look like." },
    ],
  },
];

export function getPostBySlug(slug) {
  return blogPosts.find(p => p.slug === slug) || null;
}
