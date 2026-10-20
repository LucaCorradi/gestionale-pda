import { ScrollArea, type ScrollAreaProps } from "@mantine/core"

/*
    La parte di una pagina che riempie lo spazio libero e scorre (elenco, risultati, campi del passo). In ogni pagina
    dentro WizardStepContainer c'è UNA sola area flessibile: questa, oppure un contenitore con className="area-flessibile"
    quando la parte flessibile non è un semplice elenco (es. moduli con pulsanti propri). Quando la tastiera accorcia lo
    schermo si restringe solo lei (minimo 120 px, poi scorre la pagina); titoli, campi e pulsanti restano interi
    (index.css, .contenitore-passo).
*/
export default function AreaScorrevole({ className, ...props }: ScrollAreaProps) {
    return <ScrollArea type="always" offsetScrollbars {...props} className={className ? `area-flessibile ${className}` : "area-flessibile"} />
}
