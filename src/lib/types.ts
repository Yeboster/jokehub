export interface Joke {
  id: string;
  text: string;
  category: string; // Stores the category name
  dateAdded: Date;
  used: boolean;
  funnyRate: number; // 0 for unrated, 1-5 for rating
  userId: string; // Added to associate joke with a user
}

export interface Category {
  id: string;
  name: string;
  userId: string;
  // Optionally, add createdAt: Date; if needed
}
