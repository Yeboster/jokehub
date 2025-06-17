# AI Assistant: Project Context Instructions

These files are designed to help you maintain context about the "Joke Hub" project across our development sessions.

## File Overview:

1.  **`PROJECT_CONTEXT_HISTORY.md`**:
    *   **Purpose**: Contains a detailed chronological and feature-based summary of the project's development, including requirements, tech stack, major features implemented, key decisions, and current status.
    *   **When to Update**:
        *   After significant feature milestones are completed.
        *   When major UI overhauls or architectural changes are made.
        *   When new requirements or constraints are clarified.
        *   Before a session ends if explicitly requested or if a long period of work has occurred.
        *   Periodically if the conversation spans many interactions, to ensure the summary remains fresh.
    *   **How to Update**:
        *   **Overwrite** the existing content with a new, comprehensive summary. Do not append.
        *   Ensure the summary is detailed enough to quickly bring you up to speed but concise where possible. Focus on *what* was done, *why* (if relevant from PRD/user), and *how* (briefly, e.g., which files were key).
        *   Update the "Current Status & Focus" and "Next Steps" sections accurately.

2.  **`PROJECT_PROGRESS.md`**:
    *   **Purpose**: Provides a high-level overview of completed, in-progress, and upcoming tasks/features.
    *   **When to Update**: Alongside `PROJECT_CONTEXT_HISTORY.md`, or whenever a task's status changes (e.g., from WORKING to DONE, or a new NEXT item is identified).
    *   **How to Update**:
        *   Move items between DONE, WORKING, and NEXT sections as appropriate.
        *   Keep the items as concise feature names or task descriptions.

3.  **`PROJECT_CONTEXT_INSTRUCTIONS.md`** (This file):
    *   **Purpose**: Reminds you of how to use this context persistence system.
    *   **When to Update**: Only if the user requests changes to *how* this context system itself should work.

4.  **`1st.md`**:
    *   **Purpose**: This file contains the initial prompt the user will give you at the start of a new session to load this context.
    *   **When to Update**: Generally, this file should not need frequent updates unless the core nature of the context loading changes.

## General Guidelines for Updating:

*   **Accuracy**: Ensure the information is up-to-date and accurately reflects our last interaction.
*   **Clarity**: Write clearly and concisely.
*   **Completeness**: Provide enough detail in `PROJECT_CONTEXT_HISTORY.md` for you to effectively resume work.
*   **Formatting**: Use Markdown for readability.
*   **XML for Code Changes**: Remember, these context files are for your information. Actual code changes must *always* be provided via the `<changes>` XML block in your responses. When you are asked to update these context files, you will do so by providing their new full content within such an XML block.
*   **Frequency**: When asked to "proceed with one step at a time" and a step involves creating/updating these files, treat it as a distinct step. Update these files as part of the response for that step. If multiple features are completed in a single user prompt, update the context files once at the end of implementing those features.
