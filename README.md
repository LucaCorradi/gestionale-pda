# Warehouse Client

Webapp React **semplice e leggera** per un wizard multi-step.
Stack: **React + TypeScript + Vite + Mantine + Redux Toolkit + React Router + Zod**.

---

## Requisiti
- Node 18+
- npm 9+ (o pnpm/yarn)

## Setup rapido
```bash
npm install
npm run dev
```

## Script
```bash
npm run dev       # avvia in sviluppo
npm run build     # build produzione (dist/)
npm run preview   # serve la build in locale
```

## Architettura
- Routing (JSX)
  - / → Step1
  - /wizard/step2 → Step2
  - /wizard/step3 → Step3
  - ...
  - /summary → Summary
- Shell: AppLayout con AppShell
- State (Redux slice): wizardSlice gestisce
  - currentStep, history
  - stepsData (cache dati per-step, per il summary offline)
  - selections (scelte utente)
  - azioni: goToStep, setStepData, setSelection, truncateToStep, reset
- HTTP: lib/api.ts → httpGet/httpPost (fetch nativo).
- Zod: schemi copiati 1:1 dal server in src/schema/*.schema.ts.