export interface Joke {
  id: string;
  text: string;
  category: string;
  dateAdded: Date;
  used: boolean;
  funnyRate: number; // 0 for unrated, 1-5 for rating
}
