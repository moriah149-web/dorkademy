# Questions for Moria

Items encountered during build that need your input.

## Timer duration
- The simulation timer is set to **3 hours (180 minutes)**. Is this the real exam duration? Easy to change — it's a single constant `SIMULATION_DURATION_MINUTES` at the top of `app.js`.

## Error report email
- Error reports use `mailto:` to send to `moria@dorkademy.co.il`. Update the email in `app.js` (`ERROR_REPORT_EMAIL` constant) to your actual address.

## GoatCounter setup
- Analytics requires creating a free GoatCounter account and replacing `YOUR_SITE` in the script tag in `index.html`. See README for step-by-step.

## Exam date
- The hardcoded date (15.7.2026) has been removed. Users now enter their own exam date on first visit. You may want to confirm the next real MOH exam session date to communicate to users.
