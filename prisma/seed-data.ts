export type SeedUser = {
  name: string;
  email: string;
  password: string;
  profile: {
    birthDate: string;
    city: string;
    state: string;
    experience: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    weeklyAvailability: number[];
  };
  preferences: {
    preferredVolumeMinutes: number;
    preferredDifficulty: "EASY" | "MODERATE" | "STRENUOUS";
    trainingVolumeLabel: string;
    crossTrainingPreferences: string[];
  };
};

export const seedUsers: SeedUser[] = [
  {
    name: "Test User",
    email: "testuser@example.com",
    password: "Password123",
    profile: {
      birthDate: "1992-01-15",
      city: "Frisco",
      state: "Texas",
      experience: "BEGINNER",
      weeklyAvailability: [1, 3, 5],
    },
    preferences: {
      preferredVolumeMinutes: 180,
      preferredDifficulty: "MODERATE",
      trainingVolumeLabel: "Progressive",
      crossTrainingPreferences: ["Mobility"],
    },
  },
  {
    name: "Intermediate Hiker",
    email: "intermediate@example.com",
    password: "Password123",
    profile: {
      birthDate: "1984-05-20",
      city: "Boulder",
      state: "Colorado",
      experience: "INTERMEDIATE",
      weeklyAvailability: [1, 2, 4, 6],
    },
    preferences: {
      preferredVolumeMinutes: 240,
      preferredDifficulty: "MODERATE",
      trainingVolumeLabel: "Progressive",
      crossTrainingPreferences: ["Strength"],
    },
  },
  {
    name: "Advanced Hiker",
    email: "advanced@example.com",
    password: "Password123",
    profile: {
      birthDate: "1996-09-10",
      city: "Seattle",
      state: "Washington",
      experience: "ADVANCED",
      weeklyAvailability: [0, 1, 2, 4, 5],
    },
    preferences: {
      preferredVolumeMinutes: 300,
      preferredDifficulty: "STRENUOUS",
      trainingVolumeLabel: "High volume",
      crossTrainingPreferences: ["Strength", "Cycling"],
    },
  },
];
