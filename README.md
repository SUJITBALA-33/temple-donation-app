# கோவில் திருவிழா வசூல் (Temple festival collection app)
Sheet columns: A Name, B Phone, C Total, D Previous, E Now, F Total paid, G Balance, K1 = work update (change WORK_CELL in Code.gs if different).

1. Google Sheet > Extensions > Apps Script > paste apps-script/Code.gs, change PIN > Deploy > New deployment > Web app (Execute as: Me, Access: Anyone) > copy URL.
   (If you edit the code later: Deploy > Manage deployments > Edit > New version.)
2. Put that URL in Vercel env var VITE_API_URL (see .env.example).
3. Push to GitHub, import in Vercel (Vite preset), deploy.
Local: npm install && cp .env.example .env && npm run dev
