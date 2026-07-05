# Dorkademy - אתר הכנה לבחינת רישוי בריפוי בעיסוק

אתר לימוד אינטראקטיבי לבחינת הרישוי של משרד הבריאות בריפוי בעיסוק.

## הגדרה ראשונית

### הגדרת אנליטיקס (GoatCounter)
האתר משתמש ב-[GoatCounter](https://www.goatcounter.com) — כלי אנליטיקס חינמי ופרטי.

1. היכנסו ל-[goatcounter.com](https://www.goatcounter.com) ולחצו **Sign up**
2. בחרו שם לאתר (לדוגמה: `dorkademy`) — תקבלו `dorkademy.goatcounter.com`
3. פתחו את `index.html` ושנו את השורה:
   ```html
   <script data-goatcounter="https://YOUR_SITE.goatcounter.com/count"
   ```
   ל:
   ```html
   <script data-goatcounter="https://dorkademy.goatcounter.com/count"
   ```

**אירועים שנמדדים:**
- `signup` — משתמשת חדשה הגדירה תאריך בחינה
- `plan-day-completed` — סיימה את משימות היום
- `question-answered/{topic}` — ענתה על שאלה
- `simulation-started/{simId}` — התחילה סימולציה
- `simulation-completed/{simId}/{score}` — סיימה סימולציה
- `error-report-sent/{questionId}` — דיווחה על טעות

### יעד דיווחי טעויות
דיווחי טעויות נשלחים באימייל דרך `mailto:`. לשינוי הכתובת:
1. פתחו את `js/app.js`
2. שנו את `ERROR_REPORT_EMAIL` בשורה 2

---

## איך להוסיף סימולציה חדשה

סימולציות 2 ו-3 קיימות כשלד ומוצגות כ"בקרוב" עד שמוסיפים להן שאלות.

### שלבים:
1. פתחו את `questions.json`
2. מצאו את הסימולציה (למשל `sim-2`)
3. הוסיפו מזהי שאלות ל-`questionIds`:

```json
{
    "id": "sim-2",
    "name": "סימולציה 2",
    "description": "מבחן סימולציה מלא — 100 שאלות",
    "questionIds": ["q-001", "q-002", "q-003", "..."],
    "passingScore": 60
}
```

### כללים:
- **100 שאלות** בדיוק (כמו הבחינה האמיתית)
- **אל תחזרו על שאלות** — ודאו שהמזהים לא מופיעים בסימולציות אחרות
- המזהים חייבים להתאים לשאלות קיימות ב-`questions`
- לאחר שמירה, הסימולציה תעבור מ"בקרוב" לפעילה אוטומטית

## איך להוסיף שאלות חדשות

הוסיפו שאלות למערך `questions` ב-`questions.json`:
```json
{
    "id": "q-XXX",
    "topicId": "anatomy-kinesiology",
    "question": "טקסט השאלה",
    "options": ["תשובה א", "תשובה ב", "תשובה ג", "תשובה ד"],
    "correctIndex": 0,
    "explanation": "הסבר",
    "source": "מקור (עמדה רשמית / מבחן קודם / ספר)"
}
```

### נושאים זמינים (topicId):
`anatomy-kinesiology`, `physiology-development`, `geriatrics`, `neurology`, `physical-rehab`, `upper-limb`, `pediatrics`, `mental-health`, `models-theories`, `assessment-research`, `clinical-reasoning`, `at-accessibility`

## מבנה הקבצים
```
site/
├── index.html          ← העמוד הראשי
├── js/
│   └── app.js          ← הלוגיקה של האתר
├── css/
│   └── styles.css      ← עיצוב האתר
├── questions.json      ← בנק השאלות + סימולציות
└── README.md           ← הקובץ הזה
```
