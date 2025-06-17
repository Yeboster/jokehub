# Project Context History: Joke Hub

## 1. Project Overview

**App Name**: Joke Hub

**Core Goal**: A Next.js web application for users to manage, share, and rate jokes. It includes features for manual entry, CSV import, AI-assisted joke generation, and community-based joke rating.

**Tech Stack**:
*   Next.js (App Router, Server Components, Server Actions)
*   React (Functional Components, Hooks)
*   ShadCN UI components
*   Tailwind CSS
*   Genkit (for AI, v1.x API)
*   Firebase (Firestore for database, Firebase Auth for authentication)
*   TypeScript

**Styling Guidelines**:
*   Primary color: Dark gray (#333333)
*   Secondary color: Medium gray (#666666)
*   Accent: Purple (#800080)
*   Clean, organized, modern layout.

## 2. Key Features Implemented & Major Developments

### 2.1. Authentication
*   User registration (email/password) and login functionality.
*   `AuthContext` for managing user state globally.
*   Protected routes and UI adjustments based on auth state.
*   Redirection to auth page with redirect-back query parameter.

### 2.2. Joke Management (CRUD & Core Functionality)
*   **Adding Jokes**:
    *   Manual entry via `/add-joke` page using `AddJokeForm`.
    *   Form includes fields for joke text, category (creatable combobox), and owner's funny rate.
    *   AI-assisted joke generation:
        *   `/add-joke` page has an "AI Assistant" card.
        *   Users can provide an optional topic hint.
        *   `generate-joke-flow.ts` (Genkit flow) handles joke and category suggestion.
        *   `/api/generate-joke` route to trigger the flow.
        *   Generated joke and category pre-fill the `AddJokeForm`.
*   **Viewing Jokes**:
    *   **Joke List Page (`/jokes`)**:
        *   Displays jokes using `JokeListItem` cards.
        *   Comprehensive filtering:
            *   Scope: "All Jokes" (public) or "My Jokes" (user-specific, if logged in).
            *   Categories (multi-select from available categories based on scope).
            *   Funny Rate (owner's initial rating).
            *   Used/Unused status.
        *   Lazy loading/pagination ("Load More Jokes").
    *   **Joke Detail Page (`/joke/[jokeId]`)**:
        *   Displays full joke text, category, date added, and author (generic "You" or "A user").
        *   Layout updated to match mockup design (prominent joke text, separate cards for rating and community feedback).
        *   Accessible to unauthenticated users for public jokes.
*   **Editing Jokes (`/edit-joke/[jokeId]`)**:
    *   Allows owners to edit joke text, category, owner's funny rate.
    *   Includes a `Switch` component to toggle the `used` status of the joke.
    *   Form pre-filled with existing joke data.
*   **CSV Import (`/manage` page)**:
    *   Allows logged-in users to import jokes from a CSV file.
    *   Expected CSV columns: `text`, `category`. Optional: `funnyrate`.
    *   `CSVImport` component handles file parsing and calls `importJokes` in `JokeContext`.
    *   New categories from CSV are automatically created for the user.
*   **Home Page (`/`)**:
    *   Displays the latest 3 public jokes using the `JokeListItem` component for a consistent look.

### 2.3. Rating System
*   **Submitting/Updating Ratings**:
    *   Logged-in users can rate jokes (1-5 stars) and add an optional text comment on the joke detail page (`/joke/[jokeId]`).
    *   `StarRating` component used for input.
    *   `ratingService.ts` handles Firestore interactions for creating/updating ratings in the `jokeRatings` collection.
    *   Joke document in Firestore is updated with `averageRating` and `ratingCount` after each rating submission/update.
*   **Displaying Ratings**:
    *   **Joke Detail Page (`/joke/[jokeId]`)**:
        *   "Your Rating" section shows the logged-in user's current rating and comment for the joke (if any) and allows updates.
        *   "Community Feedback" section:
            *   Displays an overall "Average Rating" for the joke (stars, numerical value) calculated from all `jokeRatings` documents. (Note: Count display next to average stars was removed from detail page as per later mockup interpretation).
            *   Lists ratings and comments from *other* users (read-only).
    *   **Joke List Page (`/jokes`)**:
        *   `JokeListItem` cards display the `averageRating` for each joke (read-only stars).
        *   If no ratings, "No ratings yet" is displayed. Rating count text was removed from here.
*   **Data Migration**:
    *   `migrations/001-owner-ratings-to-joke-ratings.ts`: A Firestore migration script was created to:
        *   Migrate existing `funnyRate` (owner's rating) from `jokes` documents to new documents in the `jokeRatings` collection for the joke owner.
        *   Calculate and update `averageRating` and `ratingCount` on existing `jokes` documents based on the new `jokeRatings` collection.

### 2.4. Context Management
*   **`JokeContext`**:
    *   Manages global state for jokes and categories.
    *   Handles fetching jokes with filters, pagination, adding, importing, updating (text, category, used status, owner's rate), and getting individual jokes.
    *   Manages user-specific and public categories.
    *   Integrates `ratingService` functions for submitting ratings and fetching all ratings for a joke.
*   **`AuthContext`**: Manages user authentication state and provides auth functions.

### 2.5. UI/UX Enhancements & Fixes
*   Consistent use of ShadCN UI components and Tailwind CSS.
*   Theme colors (primary: dark gray, secondary: medium gray, accent: purple) applied via `globals.css`.
*   Responsive Navbar with links based on auth state.
*   Toast notifications for user feedback (success, errors).
*   Loaders for asynchronous operations.
*   Error handling and graceful display (e.g., `UserCircle` icon import fix).
*   Improved layout on various pages (e.g., joke detail page, home page).
*   Removal of redundant "My Jokes" page, merging functionality into the main "Jokes" page with a scope filter.
*   Adjusted `JokeListItem` to remove owner rating, then display average rating, and finally refine the average rating display (no count, "No ratings yet" if applicable).

## 3. Current Status & Focus
The application has a robust set of features around joke management and rating. We have just completed refining the display of average ratings on `JokeListItem` cards to show "No ratings yet" when applicable and remove the explicit rating count text. The current immediate task is the creation of these context persistence files.

## 4. Next Steps
*   (User to define subsequent tasks for the Joke Hub application after these context files are created).

## 5. Important Decisions & Constraints
*   The tech stack (Next.js, React, ShadCN, Tailwind, Genkit, Firebase) is fixed.
*   Genkit v1.x API is used for AI features.
*   Firebase Rules are in place for security.
*   Placeholder images are used via `https://placehold.co`.
*   Lucide React icons are preferred.
*   Proceeding with development one step at a time to avoid getting stuck.
