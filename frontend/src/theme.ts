import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from '@mantine/core'

/*
    Tema Mantine sulle linee guida del brand Casa del Formaggio (styles/brand-tokens.css, copia di casa-del-formaggio-brand).
    Colore principale CACAO con testo bianco (il "pulsante d'ordine" del brand): scelta del titolare per la leggibilità sui
    palmari, dove il miele con testo cacao si vedeva male. Fondo avorio, pulsanti "default" quieti, poco colore.
    I colori di stato (red, yellow, green degli avvisi) restano quelli di Mantine.

    Le tavolozze di Mantine vogliono colori letterali (ne ricava le trasparenze), quindi qui i valori di tokens.css sono
    riscritti in esadecimale: se cambia il file del brand, aggiornare anche questi.
*/

// Cacao: la tonalità 9 è il colore pieno; le chiare sono le tinte calde del brand
const cacao: MantineColorsTuple = [
    '#EFEAE2', '#EFEAE2', '#EAE0D9', '#E8E1D4', '#B0946F',
    '#867054', '#76665A', '#4E3824', '#4E3824', '#402B19',
]

// I grigi di Mantine (bordi, fondi tenui, testo attenuato) diventano i neutri caldi del brand
const grigiCaldi: MantineColorsTuple = [
    '#FCF7EE', // avorio
    '#EFEAE2', // camel 80%
    '#E8E1D4', // filetto
    '#E8E1D4',
    '#B0946F', // camel: bordo dei campi
    '#B0946F',
    '#867054', // camel testo
    '#76665A', // testo secondario
    '#4E3824', // cacao chiaro
    '#402B19', // cacao
]

export const mantineTheme = createTheme({
    primaryColor: 'cdf-cacao',
    primaryShade: 9,
    // Sul cacao si scrive in bianco (theme.white), sui fondi chiari in cacao (theme.black)
    autoContrast: true,
    black: '#402B19',
    white: '#FFFFFF',
    colors: {
        'cdf-cacao': cacao,
        gray: grigiCaldi,
    },
    fontFamily: 'var(--cdf-font)',
    headings: {
        fontFamily: 'var(--cdf-font)',
        fontWeight: '300',
    },
    defaultRadius: 'sm',
    radius: {
        sm: 'var(--cdf-raggio-pulsante)',
        md: 'var(--cdf-raggio-card)',
        lg: 'var(--cdf-raggio-riquadro)',
    },
})

// Variabili che i colori da soli non bastano a sistemare: varianti "light"/"outline" del cacao leggibili,
// link in caramello, bordi sottili sui pulsanti predefiniti
export const brandCssVariables: CSSVariablesResolver = () => ({
    variables: {},
    light: {
        '--mantine-color-body': 'var(--cdf-avorio)',
        '--mantine-color-text': 'var(--cdf-cacao)',
        '--mantine-color-dimmed': 'var(--cdf-testo-secondario)',
        '--mantine-color-anchor': 'var(--cdf-caramello)',
        '--mantine-color-default-border': 'var(--cdf-filetto)',
        '--mantine-color-default-hover': 'var(--cdf-avorio)',
        // Pulsanti disattivati (es. la lente di "Cerca" a campo vuoto): riconoscibili, non quasi invisibili
        '--mantine-color-disabled': 'var(--cdf-camel-80)',
        '--mantine-color-disabled-color': 'var(--cdf-camel-testo)',
        '--mantine-color-disabled-border': 'var(--cdf-filetto)',
        '--mantine-color-cdf-cacao-filled-hover': 'var(--cdf-cacao-chiaro)',
        '--mantine-color-cdf-cacao-light': 'var(--cdf-camel-80)',
        '--mantine-color-cdf-cacao-light-hover': 'var(--cdf-caramello-80)',
        '--mantine-color-cdf-cacao-light-color': 'var(--cdf-cacao)',
        '--mantine-color-cdf-cacao-outline': 'var(--cdf-cacao)',
        '--mantine-color-cdf-cacao-outline-hover': 'var(--cdf-camel-80)',
        '--mantine-color-cdf-cacao-text': 'var(--cdf-cacao)',
    },
    dark: {},
})
