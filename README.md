# Fexel Advisor

AI-powered automation advisor for manufacturers. Guides you from "I don't know where to start" to a concrete labor analysis and ROI model — through conversation, not forms. Builds interactive widgets in real time as the picture comes together.

## Setup

```bash
npm install
```

Add your OpenAI key to `.env`:

```
OPENAI_API_KEY=sk-...
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Modes

The advisor supports multiple modes via URL query parameter. Each mode gets its own start screen, starter prompts, and workflow behavior.

**Default (manufacturing):** [http://localhost:3000](http://localhost:3000)

Machine tending, palletizing, assembly, welding — general manufacturing automation.

**Intralogistics:** [http://localhost:3000?mode=intralogistics](http://localhost:3000?mode=intralogistics)

Warehouse automation — AMRs, goods-to-person, robotic storage, pick/pack. Different start screen with warehouse-specific starter prompts.

Mode flows through as a `state_value` to the hosted workflow, which switches its behavior accordingly. No mode = default manufacturing advisor.

## Test Prompts

**Rich input — skip intake entirely**

> We run a machine tending operation — 4 CNC mills, 2 operators per shift, 3 shifts a day, 5 days a week. Fully loaded labor is about $58/hr. Parts are aluminum housings, pretty consistent geometry, cycle time is around 4 minutes per part. We're losing people constantly and I'm tired of it.

No questions needed. You gave it everything — it should build the labor snapshot widget immediately with your real numbers.

**Vague, emotionally driven**

> We have forklifts moving material all day between our warehouse and production floor. Half my accidents are forklift related. I don't even care about the cost savings — I just want people to stop getting hurt.

This is a safety conversation, not a finance conversation. It should reflect that back, ask one question to size the problem, then build something that leads with safety impact before touching ROI.

**Blank sheet of paper**

> I know I need to automate something. My dad built this business and I've taken over and labor is just getting impossible. I don't even know where to start.

One warm sentence, one question — "what does a typical day look like on your floor?" No premature widget. Get one anchor before estimating anything, then build fast once you have it.

**Intralogistics — labor reliability**

> We can't keep pickers. Turnover is constant and every peak season we're scrambling for temp labor that doesn't show up.

Should recognize this as a warehouse labor problem and respond with intralogistics-specific automation options (AMRs, goods-to-person, robotic storage).
