import type { StudyType, Workspace } from "./domain.js";

export const studyTypes: StudyType[] = [
  {
    id: "focus",
    title: "Focused practice",
    type: "focus",
    description: "Work on one clearly defined task without switching context.",
    instructions:
      "Choose a small goal, remove distractions, and work through a problem or a section of reading. Note what needs another pass.",
    suggestedMinutes: 25,
  },
  {
    id: "recall",
    title: "Active recall",
    type: "recall",
    description: "Retrieve what you know before looking at the answer.",
    instructions:
      "Close your notes. Write answers to practice questions from memory, then check and correct the gaps.",
    suggestedMinutes: 10,
  },
  {
    id: "review",
    title: "Review & explain",
    type: "review",
    description: "Connect ideas and explain them in your own words.",
    instructions:
      "Review your previous mistakes, then explain the concept as if teaching a classmate. Revisit any step you cannot explain clearly.",
    suggestedMinutes: 10,
  },
  {
    id: "spaced-repetition",
    title: "Spaced repetition",
    type: "review",
    description: "Revisit material from an earlier session instead of repeating only today's work.",
    instructions:
      "Review a set you last studied on a previous day. Try recalling each answer before checking it, then note which items need another review. This block does not automatically schedule future reviews.",
    suggestedMinutes: 15,
  },
  {
    id: "interleaving",
    title: "Interleaved practice",
    type: "focus",
    description: "Practice choosing an approach by mixing related problem types.",
    instructions:
      "Choose two or three related types of problems. Alternate between them and identify the strategy each problem needs before solving it.",
    suggestedMinutes: 20,
  },
  {
    id: "feynman",
    title: "Feynman / self-explanation",
    type: "recall",
    description: "Explain an idea in simple language to uncover gaps in your understanding.",
    instructions:
      "Put your notes aside and explain the idea as if teaching a classmate. Mark any step you cannot explain, check the source, and try the explanation again.",
    suggestedMinutes: 10,
  },
  {
    id: "break",
    title: "Rest break",
    type: "break",
    description: "Step away so your next block starts with a little more energy.",
    instructions:
      "Stand up, stretch, and rest your eyes. Leave the study material for the next block.",
    suggestedMinutes: 5,
  },
];

export function initialWorkspace(): Workspace {
  return {
    version: 1,
    sessions: [],
    flows: [
      {
        id: "pomodoro",
        title: "A little focused progress",
        tag: "General",
        totalMinutes: 30,
        blocks: [
          { id: "focus-1", title: "Focused practice", type: "focus", durationMinutes: 25 },
          { id: "break-1", title: "Rest break", type: "break", durationMinutes: 5 },
        ],
      },
    ],
    templates: [
      {
        id: "recall-loop",
        title: "Understand, recall, repeat",
        author: "Methodica starters",
        tag: "STEM",
        totalMinutes: 40,
        blocks: [
          { id: "review-1", title: "Review the concept", type: "review", durationMinutes: 10 },
          { id: "practice-1", title: "Practice problems", type: "focus", durationMinutes: 20 },
          { id: "recall-1", title: "Recall without notes", type: "recall", durationMinutes: 10 },
        ],
      },
      {
        id: "writing-loop",
        title: "From outline to first draft",
        author: "Methodica starters",
        tag: "Research",
        totalMinutes: 45,
        blocks: [
          { id: "outline-1", title: "Review your outline", type: "review", durationMinutes: 10 },
          { id: "write-1", title: "Write a first draft", type: "focus", durationMinutes: 25 },
          { id: "break-1", title: "Step away", type: "break", durationMinutes: 5 },
          { id: "review-1", title: "Read and revise", type: "review", durationMinutes: 5 },
        ],
      },
    ],
  };
}
