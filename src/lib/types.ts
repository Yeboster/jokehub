
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

export interface UserRating {
  id: string; // Firestore document ID
  jokeId: string; // ID of the joke being rated
  userId: string; // ID of the user who made the rating
  ratingValue: number; // Numerical rating, e.g., 1-5
  comment?: string; // Optional text comment
  createdAt: Date; // Timestamp of when the rating was first created
  updatedAt: Date; // Timestamp of when the rating was last updated
}
