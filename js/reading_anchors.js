// js/reading_anchors.js
// Reading Anchor Bank (A2 → C1) for placement diagnostic
// Usage: load this file before your reading engine script.

window.READING_ANCHORS = [
  {
    id: "A2",
    title: "Staff Training Session",
    cefr: "A2",
    text: `Hello everyone,

This is a reminder that we will have a staff training session next Friday, March 14th, from 10:00 a.m. to 1:00 p.m. in Conference Room B.

During the session, we will review the new attendance system and practice how to use the digital check-in tablets. Please bring your ID card and a notebook.

If you cannot attend, inform your supervisor before Wednesday so we can schedule an alternative session.

Coffee and snacks will be provided.

Best regards,
Mariana López
HR Coordinator`,
    questions: [
      {
        id: "A2_Q1",
        prompt: "What is the main purpose of the message?",
        options: [
          "To invite staff to a social event",
          "To announce a training session",
          "To introduce new employees",
          "To report attendance problems"
        ],
        correctIndex: 1,
        skill: "main_idea"
      },
      {
        id: "A2_Q2",
        prompt: "When will the training session take place?",
        options: [
          "Wednesday morning",
          "Friday morning",
          "Friday afternoon",
          "Monday morning"
        ],
        correctIndex: 1,
        skill: "detail_time"
      },
      {
        id: "A2_Q3",
        prompt: "What should staff do if they cannot attend?",
        options: [
          "Send an email after the session",
          "Ask a colleague for notes",
          "Inform their supervisor",
          "Register online"
        ],
        correctIndex: 2,
        skill: "instruction"
      }
    ],
    routing: {
      // score out of 3
      advanceIfAtLeast: 3,
      stopIfAtMost: 2,
      // stopResult is the CEFR you store if you stop here
      stopResult: "A2"
    }
  },

  {
    id: "B1",
    title: "My First Day at the New Job",
    cefr: "B1",
    text: `Last year, I started working at a marketing company in the city. On my first day, I was very nervous because I didn’t know anyone, and I was worried about making mistakes.

When I arrived, my manager showed me around the office and introduced me to the team. Everyone was friendly, which helped me relax a little. However, in the afternoon, I had to give a short presentation about my previous work experience.

I wasn’t fully prepared, and I spoke too quickly. At one point, I forgot an important detail and had to check my notes. I felt embarrassed, but my colleagues were supportive and asked helpful questions.

By the end of the day, I realized that the job environment was positive, and I felt more confident about working there.`,
    questions: [
      {
        id: "B1_Q1",
        prompt: "What is the text mainly about?",
        options: [
          "How to prepare presentations",
          "A person’s first day at a new job",
          "Problems in a marketing company",
          "Office training procedures"
        ],
        correctIndex: 1,
        skill: "main_idea"
      },
      {
        id: "B1_Q2",
        prompt: "Why was the writer nervous at the beginning?",
        options: [
          "The office was difficult to find",
          "They didn’t know the team",
          "The manager was strict",
          "The job required travel"
        ],
        correctIndex: 1,
        skill: "reason"
      },
      {
        id: "B1_Q3",
        prompt: "What happened during the afternoon?",
        options: [
          "The writer met the manager",
          "The writer gave a presentation",
          "The writer had lunch with colleagues",
          "The writer left the office early"
        ],
        correctIndex: 1,
        skill: "sequence"
      },
      {
        id: "B1_Q4",
        prompt: "How did the writer feel after forgetting a detail?",
        options: [
          "Angry",
          "Confident",
          "Embarrassed",
          "Bored"
        ],
        correctIndex: 2,
        skill: "emotion"
      }
    ],
    routing: {
      // score out of 4
      advanceIfAtLeast: 3,
      borderlineStopIfEquals: 2, // stop at B1
      lowerStopIfAtMost: 1,      // drop to A2
      stopResultBorderline: "B1",
      stopResultLower: "A2"
    }
  },

  {
    id: "B2",
    title: "Remote Work: A Permanent Shift?",
    cefr: "B2",
    text: `Over the past few years, remote work has become increasingly common across many industries. What began as a temporary response to global disruptions has, for many companies, turned into a long-term working model.

Supporters argue that working from home improves productivity and employee satisfaction. Without daily commuting, workers save time and experience less stress. In addition, companies can reduce operational costs by maintaining smaller office spaces.

However, critics point out several drawbacks. Some employees report feeling isolated, and collaboration can become more difficult without face-to-face interaction. Managers also express concern about monitoring performance and maintaining team cohesion.

Despite these challenges, many organizations are adopting hybrid models that combine remote and in-office work. This approach attempts to balance flexibility with the benefits of direct collaboration.

As technology continues to evolve, remote work is likely to remain a significant feature of modern professional life.`,
    questions: [
      {
        id: "B2_Q1",
        prompt: "What is the main focus of the article?",
        options: [
          "How to find remote jobs",
          "The growth and impact of remote work",
          "Technology used in offices",
          "Employee salary changes"
        ],
        correctIndex: 1,
        skill: "main_idea"
      },
      {
        id: "B2_Q2",
        prompt: "According to the article, what is one benefit of remote work?",
        options: [
          "Higher salaries",
          "Reduced commuting stress",
          "More promotions",
          "Shorter work hours"
        ],
        correctIndex: 1,
        skill: "detail_argument"
      },
      {
        id: "B2_Q3",
        prompt: "What is the writer’s overall position on remote work?",
        options: [
          "Completely negative",
          "Neutral but analytical",
          "Strongly opposed",
          "Focused only on disadvantages"
        ],
        correctIndex: 1,
        skill: "stance"
      },
      {
        id: "B2_Q4",
        prompt: "What does the word “cohesion” most nearly mean in the text?",
        options: [
          "Competition",
          "Team unity",
          "Productivity",
          "Supervision"
        ],
        correctIndex: 1,
        skill: "lexical_inference"
      }
    ],
    routing: {
      // score out of 4
      advanceIfAtLeast: 3,          // go C1
      borderlineStopIfEquals: 2,    // stop B2
      lowerStopIfAtMost: 1,         // drop B1
      stopResultBorderline: "B2",
      stopResultLower: "B1"
    }
  },

  {
    id: "C1",
    title: "The Illusion of Constant Productivity",
    cefr: "C1",
    text: `In contemporary professional culture, productivity is often treated as both a virtue and a moral obligation. Individuals are encouraged not only to perform efficiently but to optimize every moment of their time. This mindset, while seemingly beneficial, raises important questions about sustainability and well-being.

Advocates of productivity culture argue that structured routines and measurable output create clarity and progress. Digital tools, performance metrics, and workflow systems promise to eliminate inefficiency and maximize achievement. From this perspective, time not spent producing is frequently framed as time wasted.

However, critics suggest that this relentless pursuit of output may carry hidden costs. The pressure to remain constantly productive can erode creativity, increase burnout, and diminish opportunities for reflection. Innovation, after all, often emerges from periods of rest, observation, and unstructured thinking.

Moreover, equating personal value with productivity risks reducing human experience to quantifiable results. Such a framework may neglect emotional well-being, interpersonal relationships, and intellectual exploration that cannot be easily measured.

Recognizing these tensions, some organizations are beginning to re-evaluate performance models, incorporating flexibility, mental health initiatives, and alternative productivity indicators.

Ultimately, the challenge lies not in rejecting productivity altogether, but in redefining it in ways that sustain both performance and human fulfillment.`,
    questions: [
      {
        id: "C1_Q1",
        prompt: "What is the main argument of the text?",
        options: [
          "Productivity tools improve efficiency",
          "Productivity culture should be completely rejected",
          "Productivity should be reconsidered to balance well-being and performance",
          "Companies should eliminate performance metrics"
        ],
        correctIndex: 2,
        skill: "central_argument"
      },
      {
        id: "C1_Q2",
        prompt: "Which assumption underlies the critics’ perspective?",
        options: [
          "Employees prefer remote work",
          "Creativity requires uninterrupted productivity",
          "Excessive productivity pressure harms innovation",
          "Performance metrics are inaccurate"
        ],
        correctIndex: 2,
        skill: "implicit_assumption"
      },
      {
        id: "C1_Q3",
        prompt: "What does the phrase “quantifiable results” most nearly imply in the text?",
        options: [
          "Financial profits only",
          "Measurable achievements",
          "Scientific data",
          "Employee satisfaction"
        ],
        correctIndex: 1,
        skill: "concept_inference"
      }
    ],
    routing: {
      // ceiling anchor
      ceiling: true,
      // interpret score out of 3
      strongIfAtLeast: 3,     // C1
      borderlineIfEquals: 2,  // C1-
      elseResult: "B2"        // 0–1 correct
    }
  }
];
