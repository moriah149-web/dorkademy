# Dorkademy - אתר הכנה לבחינת רישוי בריפוי בעיסוק

אתר לימוד אינטראקטיבי לבחינת הרישוי של משרד הבריאות בריפוי בעיסוק.

## איך להעלות את האתר לאינטרנט (בחינם!) - צעד אחר צעד

### שלב 1: יצירת חשבון GitHub
1. היכנסו ל-[github.com](https://github.com)
2. לחצו על **Sign up** (הרשמה)
3. הזינו אימייל, סיסמה, ושם משתמש
4. עברו את האימות ולחצו **Create account**
5. אשרו את האימייל שנשלח אליכם

### שלב 2: יצירת Repository (מאגר) חדש
1. לאחר ההתחברות, לחצו על **+** בפינה הימנית העליונה → **New repository**
2. בשדה **Repository name** כתבו: `dorkademy`
3. ודאו שהאפשרות **Public** מסומנת
4. לחצו על **Create repository**

### שלב 3: העלאת הקבצים
1. בעמוד של ה-Repository החדש, לחצו על **Add file** → **Upload files**
2. גררו את **כל הקבצים** למסך (index.html, questions.json, app.js, styles.css, README.md)
3. למטה, בשדה **Commit changes**, כתבו: "העלאת האתר"
4. לחצו על **Commit changes**

### שלב 4: הפעלת GitHub Pages
1. בעמוד ה-Repository, לחצו על **Settings** (הגדרות) - בשורת הטאבים למעלה
2. בתפריט הצד, לחצו על **Pages**
3. תחת **Source**, בחרו **Deploy from a branch**
4. תחת **Branch**, בחרו **main** ולחצו **Save**
5. חכו דקה-שתיים

### שלב 5: מציאת הכתובת של האתר
1. חזרו ל-**Settings** → **Pages**
2. תראו הודעה: **Your site is live at** עם קישור
3. הקישור יהיה: `https://שם-המשתמש-שלכם.github.io/dorkademy/`
4. זהו! האתר באוויר! 🎉

---

## הגדרת אנליטיקס (GoatCounter)

האתר משתמש ב-[GoatCounter](https://www.goatcounter.com) — כלי אנליטיקס חינמי ופרטי.

### הגדרה:
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
4. שמרו ודחפו ל-GitHub

### מה עוקבים:
- **signup** — משתמשת חדשה הגדירה תאריך בחינה (ביקור ראשון)
- **plan-day-completed** — סיימה את משימות היום
- **question-answered/{topic}** — ענתה על שאלה (עם נושא)
- **simulation-started/{simId}** — התחילה סימולציה
- **simulation-completed/{simId}/{score}** — סיימה סימולציה (עם ציון)
- **error-report-sent/{questionId}** — דיווחה על טעות

### איפה לראות:
היכנסו ל-`dorkademy.goatcounter.com` — שם תראו כמה משתמשות השבוע, אילו אירועים קורים, ונתוני שימוש.

---

## יעד לדיווחי טעויות (Error Reports)

דיווחי טעויות נשלחים באימייל דרך `mailto:`. כדי לשנות את כתובת האימייל:

1. פתחו את `app.js`
2. מצאו את השורה: `const ERROR_REPORT_EMAIL = 'moria@dorkademy.co.il';`
3. שנו לאימייל הרצוי

---

## איך להוסיף סימולציה חדשה

הסימולציות מוגדרות ב-`questions.json` תחת `"simulations"`. סימולציות 2 ו-3 קיימות כשלד ומוצגות כ"בקרוב" עד שמוסיפים להן שאלות.

### שלבים:
1. פתחו את `questions.json`
2. מצאו את הסימולציה (למשל `sim-2`)
3. הוסיפו את מזהי השאלות ל-`questionIds`:

```json
{
    "id": "sim-2",
    "name": "סימולציה 2",
    "description": "מבחן סימולציה מלא — 100 שאלות",
    "questionIds": ["q-001", "q-002", "q-003"],
    "passingScore": 60
}
```

### כללים:
- **100 שאלות** בדיוק (כמו הבחינה האמיתית)
- **אל תחזרו על שאלות** — ודאו שהמזהים לא מופיעים בסימולציות אחרות
- המזהים חייבים להתאים לשאלות קיימות ב-`questions`
- לאחר שמירה, הסימולציה תעבור מ"בקרוב" לפעילה אוטומטית

### איך להוסיף שאלות חדשות:
הוסיפו שאלות למערך `questions` בפורמט:
```json
{
    "id": "q-XXX",
    "topicId": "anatomy-kinesiology",
    "question": "טקסט השאלה",
    "options": ["תשובה א", "תשובה ב", "תשובה ג", "תשובה ד"],
    "correctIndex": 0,
    "explanation": "הסבר למה זו התשובה הנכונה",
    "source": "מקור השאלה (עמדה רשמית / מבחן קודם / ספר)"
}
```

### נושאים זמינים (topicId):
`anatomy-kinesiology`, `physiology-development`, `geriatrics`, `neurology`, `physical-rehab`, `upper-limb`, `pediatrics`, `mental-health`, `models-theories`, `assessment-research`, `clinical-reasoning`, `at-accessibility`

---

## מבנה הקבצים
```
dorkademy/
├── index.html          ← העמוד הראשי
├── app.js              ← הלוגיקה של האתר
├── styles.css          ← עיצוב האתר
├── questions.json      ← בנק השאלות + סימולציות
└── README.md           ← הקובץ הזה
```
