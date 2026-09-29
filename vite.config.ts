import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// I palmari usati in negozio hanno la Android System WebView vecchia (a volte senza Play Store per
// aggiornarla) e non capiscono la sintassi JS moderna che Vite genera di default: mostrano "aggiorna
// WebView" invece di caricare la pagina. Il plugin "legacy" costruisce ANCHE un bundle in JS piu'
// datato (transpilato ed espanso con i polyfill necessari), caricato automaticamente al posto di
// quello moderno dai browser che non supportano gli <script type="module">. Sui palmari nuovi/aggiornati
// non cambia nulla: continuano a scaricare il bundle moderno, piu' piccolo.
export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: true
  },
  plugins: [
    react(),
    legacy({
      // Copre anche Android/Chromium vecchi (Chrome per Android >= 4.4), non solo i desktop datati.
      targets: ['defaults', 'not IE 11', 'Android >= 4.4', 'ChromeAndroid >= 40'],
    }),
  ],
})