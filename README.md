# EduTrack - Student Portal

**Live site:** https://username.github.io/edutrack/
**Repository:** https://github.com/username/edutrack

EduTrack is a responsive student portal prototype built for IMS566 Advanced Web Design Development and Content Management. Students sign in, view a home dashboard with charts, manage courses and tasks (add, edit, delete), edit their profile, and chat with a study assistant in course channels.

## Features

- **Authentication:** sign-in and registration with validation and clear error messages. Credentials are simulated with hardcoded demo data (no database).
- **Auto-save of sign-in details:** username and password are saved as the user types (when enabled), restored on the next visit, and can be removed with "Forget saved details".
- **Profile management:** edit full name, email and programme, and change the password (current password required).
- **Home dashboard:** welcome message, summary cards, a bar chart of course progress, a doughnut chart of task status, and the five soonest open deadlines.
- **Courses:** a course navigation bar with status views (All, In progress, Completed, Not started) and live counts, search, and add, edit and delete through a validated form.
- **Tasks:** card grid sorted by due date, with status filters and add, edit and delete.
- **Study chat:** course channels, persistent history, typing indicator, message search, slash commands (`/tasks`, `/progress`, `/help`) and clear conversation.
- **Navigation:** a vertical sidebar at the top left of every signed-in page on desktop, with expandable submenus. On phones and tablets, the three-line hamburger opens the same menu. Both are built from one definition, so they cannot show conflicting entries.
- **Theme:** light and dark modes, remembered between visits.
- **Route protection:** pages require sign-in and redirect to the login page otherwise.
- **Accessibility:** semantic HTML, ARIA labels, keyboard focus styles, live regions and reduced-motion support.

## Pages

| Page | File | Access |
|---|---|---|
| Home (dashboard) | `index.html` | Signed in |
| Courses | `courses.html` | Signed in |
| Tasks | `tasks.html` | Signed in |
| Study chat | `chat.html` | Signed in |
| My profile | `profile.html` | Signed in |
| Sign in and register | `login.html` | Public |

## Instructions to Test

**Sign in**
1. Open the live link. You are sent to the sign-in page.
2. Sign in with the demo account: username `student`, password `edutrack123`.
3. Test error feedback with a wrong password or an empty field.
4. Test auto-save: type a username and password, reload, and the fields are filled in again.
5. Test registration: click **Create one**, complete the form, and sign in.

**Profile**
1. Open the hamburger menu, then **Account > My profile**.
2. Change your name, email or programme and save. The top bar and summary card update.
3. Change your password, using the current password, then sign out and sign in with the new one.

**Courses and tasks**
1. Open **Courses**. Use the status tabs and search bar to filter the list.
2. Click **Add course**, then **Edit** or **Delete** on any row.
3. Open **Tasks** and use the same add, edit and delete actions.
4. The home dashboard charts update after each change.
5. To restore the sample data, open **Account > Restore sample data**.

**Study chat**
- Open **Study chat** and try `/help`, `/tasks`, `/progress`, or "hello".

## Frameworks and Libraries

| Library | Version | Purpose |
|---|---|---|
| Bootstrap | 5.3.3 | Layout, forms, cards, modals, off-canvas menu, dark mode |
| Bootstrap Icons | 1.11.3 | Interface icons |
| Chart.js | 4.4.1 | Dashboard charts |
| Inter (Google Fonts) | - | Typeface |
| Vanilla JavaScript | ES2020+ | Authentication, CRUD, navigation, chat logic |

## Project Structure

```
edutrack/
├── index.html          Home dashboard
├── courses.html        Course navigation bar and table
├── tasks.html          Task cards
├── chat.html           Study chat
├── profile.html        Profile and password
├── login.html          Sign in and registration
├── assets/
│   └── logo.svg        Logo and browser tab icon
├── css/
│   └── style.css       Shared styles
└── js/
    ├── data.js         Seed content and demo account
    ├── store.js        CRUD and persistence (localStorage)
    ├── common.js       Navigation, auth guard, theme, footer, toasts
    ├── auth.js         Sign-in, auto-save, registration
    ├── dashboard.js    Home cards, charts, deadlines
    ├── courses.js      Course navigation bar, table and form
    ├── tasks.js        Task cards and form
    ├── chat.js         Channels, thread, assistant rules
    └── profile.js      Profile and password editing
```

## Content Management Approach

Seed content is in `js/data.js`, with metadata such as ids, tags and `lastUpdated`. `js/store.js` is the single data layer for courses, tasks and messages. Each change fires an `edutrack:data` event, so every page stays in sync. Profile edits are stored separately and merged into the demo account.

## Running Locally

No build step is needed. Open `login.html` in Google Chrome, or serve the folder with any static server.

## Deploying to GitHub Pages

1. Create a public repository named `edutrack` on GitHub.
2. Upload all files in this folder, keeping the folder structure.
3. Go to **Settings > Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then click **Save**.
5. After a minute or two, the site is live at `https://username.github.io/edutrack/`.

## Limitations

- Authentication is simulated. Passwords, including auto-saved ones, are stored unencrypted in the browser. This is acceptable for a coursework prototype but not for real use.
- Data changes are saved per browser (localStorage) and do not sync between devices.
- The chat assistant is rule-based, not an AI model.

## Browser

Developed and tested in Google Chrome.
