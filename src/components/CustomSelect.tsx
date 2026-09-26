import { Select, type ComboboxData, type ComboboxItem, type SelectProps } from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks"

type CustomSelectProps = {
    data: ComboboxData
    value: string | null
    onChange: (value: string | null, option: ComboboxItem) => void
    label?: string
    description?: React.ReactNode
    disabled?: boolean
    clearable?: boolean
    error?: React.ReactNode
    comboboxProps?: SelectProps['comboboxProps']
}

export const CustomSelect = ({ data, value, onChange, label, description, disabled, clearable = true, error, comboboxProps }: CustomSelectProps) => {
    const isTouchDevice = useMediaQuery('(pointer: coarse)')

    return (
        <Select
            data={data}
            value={value}
            onChange={onChange}
            label={label}
            description={description}
            placeholder={data.length ? `Seleziona ${label}` : `Nessun ${label} disponibile`}
            comboboxProps={comboboxProps}

            disabled={disabled ?? !data.length}
            clearable={clearable}

            error={error}

            searchable={!isTouchDevice}
        />
    )

}