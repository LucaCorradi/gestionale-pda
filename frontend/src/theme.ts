import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from '@mantine/core'

/*
    Tema Mantine sulle linee guida del brand Casa del Formaggio (styles/brand-tokens.css, copia di casa-del-formaggio-brand).
    Riferimento visivo l'area admin di gestionale-code: fondo avorio, testo cacao, pulsante principale miele con testo cacao,
    pulsanti "default" quieti, poco colore. I colori di stato (red, yellow, green degli avvisi) restano quelli di Mantine.

    Le tavolozze di Mantine vogliono colori letterali (ne ricava le trasparenze), quindi qui i valori di tokens.css sono
    riscritti in esadecimale: se cambia il file del brand, aggiornare anche questi.
*/

// Miele: la tonalità 5 è il colore pieno; le chiare sono le tinte del brand, le scure il "miele testo"
const miele: MantineColorsTuple = [
    '#FFF1D7', '#FFF1D7', '#FFDFA5', '#FFDFA5', '#FFB838',
    '#FFB838', '#FFB838', '#966D21', '#966D21', '#966D21',
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
    primaryColor: 'cdf-miele',
    primaryShade: 5,
    // Sul miele si scrive in cacao (theme.black), mai in bianco
    autoContrast: true,
    black: '#402B19',
    white: '#FFFFFF',
    colors: {
        'cdf-miele': miele,
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

// Variabili che i colori da soli non bastano a sistemare: contrasto delle varianti "light"/"outline" sul miele,
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
        '--mantine-color-cdf-miele-filled-hover': 'var(--cdf-miele-55)',
        '--mantine-color-cdf-miele-light': 'var(--cdf-miele-80)',
        '--mantine-color-cdf-miele-light-hover': 'var(--cdf-miele-55)',
        '--mantine-color-cdf-miele-light-color': 'var(--cdf-cacao)',
        '--mantine-color-cdf-miele-outline': 'var(--cdf-cacao)',
        '--mantine-color-cdf-miele-outline-hover': 'var(--cdf-crema)',
        '--mantine-color-cdf-miele-text': 'var(--cdf-miele-testo)',
    },
    dark: {},
})
