# Candidate Detail Page Refactoring Guide

## Overview
This document outlines the refactoring strategy for the candidate detail page, breaking down a 3000+ line monolithic component into smaller, maintainable modules.

## New Structure

```
[id]/
├── page.tsx                    # Main page (orchestrator, ~300-400 lines)
├── types.ts                    # TypeScript interfaces
├── constants.ts                # Constants and utility functions
├── hooks/
│   ├── useCandidate.ts         # Candidate data fetching
│   ├── useCandidateActions.ts  # Action handlers (select, reject, etc.)
│   ├── useCandidatePermissions.ts # Permission checks
│   └── useInterviewScheduling.ts # Interview scheduling logic
├── utils/
│   ├── pdf-generators.ts       # PDF generation functions
│   └── time-utils.ts           # Time conversion utilities
└── components/
    ├── CandidateHeader.tsx     # Header section
    ├── CandidateSidebar.tsx   # Sidebar (contact, actions, documents)
    ├── CandidateMainContent.tsx # Main content area
    ├── SelectionDetails.tsx    # Selection details card
    ├── InterviewRemarks.tsx    # Interview remarks display
    ├── dialogs/
    │   ├── ScheduleInterviewDialog.tsx
    │   ├── ScheduleSecondRoundDialog.tsx
    │   ├── EditRoleDialog.tsx
    │   └── RequestResignatureDialog.tsx
    └── pdf/
        ├── TrainingAgreementSection.tsx
        ├── HrPoliciesSection.tsx
        ├── LetterOfIntentSection.tsx
        └── OnboardingAgreementSection.tsx
```

## Benefits

1. **Separation of Concerns**: Each file has a single responsibility
2. **Reusability**: Components and hooks can be reused elsewhere
3. **Testability**: Smaller units are easier to test
4. **Maintainability**: Changes are localized to specific files
5. **Readability**: Main page is now a clean orchestrator

## Migration Strategy

1. ✅ Extract types to `types.ts`
2. ✅ Extract constants to `constants.ts`
3. ✅ Create custom hooks for data fetching and actions
4. ✅ Extract PDF generation utilities
5. 🔄 Extract UI components (Header, Sidebar, MainContent)
6. ⏳ Extract dialog components
7. ⏳ Refactor main page to use extracted components

## Next Steps

After completing the refactoring:
- Add unit tests for hooks and utilities
- Add Storybook stories for components
- Consider adding error boundaries
- Optimize bundle size with dynamic imports for dialogs

