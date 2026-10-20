import { TextInput, type TextInputProps } from "@mantine/core"
import { useRef, useState, type Ref } from "react"
import { selectAllOnClick, selectAllOnFocus } from "../lib/utils"

type CampoDaSparareProps = Omit<TextInputProps, "inputMode"> & {
    // Invio (lo manda lo scanner a fine codice, o l'operatore dalla tastiera)
    onScan?: () => void
    ref?: Ref<HTMLInputElement>
}

/*
    Campo per codici, alias e barcode: si usa SEMPRE questo, mai un TextInput a mano, così tutti i campi da sparare del
    palmare si comportano allo stesso modo (CLAUDE.md, "Interfaccia sui palmari").
    - Quando il cursore ci arriva da solo (apertura pagina, dopo uno sparo) la tastiera virtuale NON si apre: coprirebbe lo
      schermo e lo scanner scrive comunque, perché per il palmare è una tastiera fisica (inputMode="none").
    - Se l'operatore tocca il campo la tastiera si apre per scrivere a mano; dopo Invio o uscendo dal campo torna chiusa.
    - Al tocco il testo si seleziona tutto: lo sparo successivo sovrascrive il codice precedente.
    I campi di testo libero (descrizioni, ricerche per nome) restano TextInput normali: lì la tastiera serve subito.
*/
export default function CampoDaSparare({ onScan, onKeyDown, onFocus, onClick, onBlur, ref, ...props }: CampoDaSparareProps) {
    const [keyboard, setKeyboard] = useState(false)
    // Per aprire la tastiera si esce e si rientra nel campo (cambiare inputMode a campo attivo non basta): quell'uscita
    // non deve contare come "uscita dal campo" per chi usa onBlur (es. ricerca all'uscita)
    const reopening = useRef(false)

    return (
        <TextInput
            {...props}
            ref={ref}
            inputMode={keyboard ? "text" : "none"}
            onFocus={(e) => {
                selectAllOnFocus(e)
                onFocus?.(e)
            }}
            onClick={(e) => {
                selectAllOnClick(e)
                onClick?.(e)
                if (keyboard) return
                const input = e.currentTarget
                reopening.current = true
                setKeyboard(true)
                input.blur()
                setTimeout(() => {
                    input.focus()
                    reopening.current = false
                }, 50)
            }}
            onBlur={(e) => {
                if (reopening.current) return
                setKeyboard(false)
                onBlur?.(e)
            }}
            onKeyDown={(e) => {
                if (e.key === "Enter" && onScan) {
                    e.preventDefault()
                    e.stopPropagation()
                    setKeyboard(false)
                    onScan()
                }
                onKeyDown?.(e)
            }}
        />
    )
}
