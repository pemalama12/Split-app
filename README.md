# Split-app

Split-app is a mobile-first expense-sharing application for iOS and Android. It helps friends and groups record shared costs, understand net balances, and settle debts without maintaining spreadsheets or doing bill math by hand.

The product is inspired by Splitwise and adds a phone-friendly receipt workflow where one signed-in organizer can assign individual or shared line items to group members who do not need accounts.

## Main features

- Email verification-code authentication with Clerk
- Private groups managed by the signed-in user
- Placeholder group members who do not need accounts
- Create, edit, and delete expenses
- One payer per expense with independent participant selection
- Equal and exact custom-amount splits
- Manual receipt entry with camera or photo-library images
- Individual and shared receipt items
- Proportional tax and tip allocation with deterministic cent rounding
- Net group balances and simplified “who pays whom” suggestions
- Partial settlements with overpayment prevention
- Group and cross-group activity views
- Profile display-name management
- Purpose-built loading, empty, success, and error states

## Tech stack

- [Expo SDK 57](https://docs.expo.dev/) and React Native 0.86
- [Expo Router](https://docs.expo.dev/router/introduction/) with native tabs
- React 19 and TypeScript
- [Clerk](https://clerk.com/) for authentication
- [Convex](https://www.convex.dev/) for the database, server functions, real-time queries, and receipt-file storage
- Expo Image Picker for camera and photo-library access
- npm for dependency management

The UI uses React Native `StyleSheet` styling and shared design tokens. There is no browser Tailwind dependency in the native application.

## Project structure

```text
Split-app/
├── assets/                  # App icons, splash assets, and bundled images
├── convex/                  # Schema, queries, mutations, auth config, and ledger logic
│   ├── _generated/          # Convex-generated client/server bindings
│   └── lib/                 # Authorization and financial calculation helpers
├── src/
│   ├── app/                 # Expo Router screens and navigation layouts
│   │   ├── (tabs)/          # Groups, Activity, and Profile native tabs
│   │   ├── expense/         # Expense details
│   │   └── group/           # Group, member, expense, receipt, and settlement flows
│   ├── components/          # Reusable native UI components
│   ├── constants/           # Theme and design tokens
│   └── lib/                 # Client-side money and error helpers
├── app.json                 # Expo app and native plugin configuration
├── package.json             # Scripts and dependencies
└── tsconfig.json            # Strict TypeScript configuration
```

## Prerequisites

Install or create the following before running the complete app:

- A current Node.js LTS release and npm
- An Expo-compatible iOS or Android development environment, or Expo Go where supported
- A Clerk application with email verification codes enabled
- A Convex project connected to this repository
- Clerk’s Convex integration or a JWT template named `convex`

## Installation

1. Clone the repository and enter it:

   ```bash
   git clone https://github.com/pemalama12/Split-app.git
   cd Split-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

4. Add your own public Clerk and Convex values to `.env.local`.

5. Connect and run the Convex development deployment:

   ```bash
   npx convex dev
   ```

Never commit `.env.local`, Clerk secret keys, Convex deploy keys, tokens, or service credentials.

## Environment variables

The Expo client reads only public configuration from `.env.local`:

```dotenv
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_replace_with_your_publishable_key
EXPO_PUBLIC_CONVEX_URL=https://replace-with-your-deployment.convex.cloud
```

Convex also needs the Clerk JWT issuer domain configured as a server-side environment variable. Set it through Convex rather than exposing it as an Expo public variable:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://replace-with-your-clerk-issuer.example
```

Do not add `CLERK_SECRET_KEY` or `CONVEX_DEPLOY_KEY` to the mobile app environment.

## Run the development version

Keep `npx convex dev` running, then start Expo in a second terminal:

```bash
npx expo start
```

Use the Expo terminal controls or QR code to open the project on iOS or Android. Camera receipt capture must be tested on a physical device; the iOS simulator does not provide a camera.

## Build

This project uses Expo’s Continuous Native Generation, so native `ios/` and `android/` directories are generated and should not be edited by hand.

Configure EAS once:

```bash
npx eas-cli@latest build:configure
```

Create cloud builds:

```bash
npx eas-cli@latest build --platform ios
npx eas-cli@latest build --platform android
```

After adding or changing a package with native code, use a development build rather than assuming it is available in Expo Go.

## Quality checks

Run these checks before opening a pull request:

```bash
npx expo lint
npx tsc --noEmit
npx expo-doctor
```

Automated unit and end-to-end test suites have not been added yet. Financial allocation and settlement logic are high-priority candidates for unit coverage.

## Usage

The intended MVP flow is:

1. Sign in or create an account using an email verification code.
2. Complete a display name if Clerk does not provide one.
3. Create a group and add placeholder members by name.
4. Add a standard expense or manually enter and assign receipt items.
5. Review each member’s balance and the simplified payment suggestions.
6. Record a full or partial settlement after money changes hands.
7. Review group history or the combined Activity tab.

All amounts are currently stored as integer cents in USD. The MVP is online-only and does not transfer real money.

## Current status

Split-app is an active MVP/Shipathon project. The repository contains the core mobile screens, Convex schema and server functions, authentication integration, receipt flow, and ledger calculations. It still requires project-specific Clerk and Convex configuration before the full signed-in flow can run. Production hardening, automated tests, and store release configuration remain in progress.

## Future improvements

- OCR-assisted receipt scanning with explicit user confirmation
- Account-based group invitations and deep links
- Push reminders and settlement notifications
- Multiple currencies and optional conversion
- Offline read support and carefully designed write synchronization
- Recurring expenses
- Broader accessibility and internationalization testing
- Unit, integration, and end-to-end test coverage
- Production observability and error reporting

## Contributing

1. Create a focused branch from `main`.
2. Keep secrets and local environment files out of Git.
3. Use Expo-compatible dependency installation for native packages: `npx expo install <package>`.
4. Keep route files in `src/app/` and reusable code outside the route tree.
5. Run lint, TypeScript, and Expo Doctor before submitting a pull request.
6. Describe user-facing behavior, data-model changes, and manual verification in the pull request.

Avoid force-pushing shared branches and do not rewrite published history without explicit maintainer approval.

## License

This project is licensed under the terms in [LICENSE](./LICENSE).
