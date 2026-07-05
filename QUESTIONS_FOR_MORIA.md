# Questions for Moria

Items encountered during build that need your input.

## Timer duration
- The simulation timer is set to **3 hours (180 minutes)**. Is this the real exam duration? Easy to change — single constant `SIMULATION_DURATION_MINUTES` at top of `js/app.js`.

## Error report email
- Error reports use `mailto:` to send to `moria@dorkademy.co.il`. Update the email in `js/app.js` (`ERROR_REPORT_EMAIL` constant) to your actual address.

## GoatCounter setup
- Analytics requires creating a free GoatCounter account and replacing `YOUR_SITE` in the script tag in `index.html`. See README for step-by-step.

## Exam date
- The hardcoded date (15.7.2026) has been removed. Users now enter their own exam date on first visit. Confirm next real MOH exam session date to communicate to users.

## Reset progress behavior
- When a user resets progress (Settings), the exam date is preserved (not wiped). This seemed like the right UX — confirm?

## Daily plan weighting
- The daily plan now distributes topics weighted by question count per topic (proxy for syllabus weight, as specified in the brief). Topics with more questions get more study days. This is approximate — confirm if a different weighting source exists.
