import type { Category, Difficulty, DrawingChallenge } from "@/lib/types";

export const challengeSubjects: Array<{
  subject: string;
  category: Category;
  difficulty: Difficulty;
  durationMinutes: DrawingChallenge["durationMinutes"];
}> = [
  { subject: "an old pair of sneakers viewed from above", category: "Objects", difficulty: "Beginner", durationMinutes: 15 },
  { subject: "a coffee mug held in one hand", category: "Hands", difficulty: "Intermediate", durationMinutes: 10 },
  { subject: "a Cape Town street corner shop", category: "Buildings", difficulty: "Intermediate", durationMinutes: 30 },
  { subject: "a sleeping cat curled on a chair", category: "Animals", difficulty: "Beginner", durationMinutes: 15 },
  { subject: "a football player mid kick", category: "Football", difficulty: "Advanced", durationMinutes: 10 },
  { subject: "a simple side profile portrait", category: "Faces", difficulty: "Beginner", durationMinutes: 10 },
  { subject: "a bicycle leaning against a wall", category: "Vehicles", difficulty: "Intermediate", durationMinutes: 30 },
  { subject: "a narrow alley with strong perspective", category: "Perspective", difficulty: "Advanced", durationMinutes: 30 },
  { subject: "a bowl of fruit on a kitchen table", category: "Food", difficulty: "Beginner", durationMinutes: 15 },
  { subject: "a mountain path with trees", category: "Landscapes", difficulty: "Intermediate", durationMinutes: 30 }
];

export function createRandomChallenge(random = Math.random): DrawingChallenge {
  const item = challengeSubjects[Math.floor(random() * challengeSubjects.length)] ?? challengeSubjects[0];

  return {
    ...item,
    description: `${item.subject}, ${item.difficulty}, ${item.durationMinutes} minutes`
  };
}

export function getDailyChallenge(date = new Date()): DrawingChallenge {
  const dayKey = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
  const item = challengeSubjects[Math.abs(Math.floor(dayKey)) % challengeSubjects.length] ?? challengeSubjects[0];

  return {
    ...item,
    description: `${item.subject}, ${item.difficulty}, ${item.durationMinutes} minutes`
  };
}
