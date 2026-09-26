import type { PayloadAction } from "@reduxjs/toolkit"
import { createSlice } from "@reduxjs/toolkit"
import type { DepartmentResponse } from "../../schemas/departmentSchema"
import type { OperationTypeResponse } from "../../schemas/operationTypeSchema"
import type { OperationDetailResponse } from "../../schemas/operationDetailSchema"
import type { ProductRow } from "../../components/ProductForm"

export type StepId = "step1" | "step2" | "step3" | "step4" | "summary"

// What to eliminate when I truncate to a step
const TRUNCATE_RULES: Record<StepId, { dropStepsData: StepId[]; dropSelections: (keyof WizardSelections)[] }> = {
    step1: {
        dropStepsData: ["step2", "step3"],
        dropSelections: ["operationType", "operationDetails"]
    },
    step2: {
        dropStepsData: ["step3"],
        dropSelections: ["operationDetails"]
    },
    step3: {
        dropStepsData: [],
        dropSelections: []
    },
    step4: {
        dropStepsData: [],
        dropSelections: []
    },
    summary: {
        dropStepsData: [],
        dropSelections: []
    }
}

// Selection types
export type DepartmentSelection = DepartmentResponse
export type OperationTypeSelection = OperationTypeResponse
export type OperationDetailsSelection = OperationDetailResponse & { operationDate: string | null }

// Cached types
type Step1Data = DepartmentResponse[]
type Step2Data = OperationTypeResponse[]
type Step3Data = OperationDetailResponse[]
type Step4Data = unknown
type WizardSelections = {
    department?: DepartmentSelection
    operationType?: OperationTypeSelection
    operationDetails?: OperationDetailsSelection
    products?: ProductRow[]
}

// Internal types
type WizardState = {
    currentStep: StepId | null
    stepsData: {
        step1?: Step1Data
        step2?: Step2Data
        step3?: Step3Data
        step4?: Step4Data
        summary?: unknown
    }
    selections: WizardSelections
    history: StepId[]
}

// Factory function for empty state, useful for reset
const createInitialState = (): WizardState => ({
    currentStep: null,
    stepsData: {},
    selections: {},
    history: []
})

// Actual initial state
const initialState: WizardState = createInitialState()


// Discriminated payloads
type SelectionPayload =
    | { key: "department"; value: DepartmentSelection }
    | { key: "operationType"; value: OperationTypeSelection }
    | { key: "operationDetails"; value: OperationDetailsSelection }
    | { key: "products"; value: ProductRow[] }

// Reducer
const wizard = createSlice({
    name: 'wizard',
    initialState,
    reducers: {
        goToStep(state, action: PayloadAction<StepId>) {
            const id = action.payload
            state.currentStep = id
            const idx = state.history.indexOf(id)
            if (idx >= 0) state.history = state.history.slice(0, idx + 1)
            else state.history.push(id)
        },
        setStepData(state, action: PayloadAction<{ step: StepId, data: unknown }>) {
            state.stepsData[action.payload.step] = action.payload.data as any
        },
        setSelection(state, action: PayloadAction<SelectionPayload>) {
            const { key, value } = action.payload
            state.selections[key] = value as any
        },
        truncateToStep(state, action: PayloadAction<StepId>) {
            const target = action.payload
            state.currentStep = target

            const idx = state.history.indexOf(target)

            // If target isn't present, history is replaced with [target]
            state.history = idx >= 0 ? state.history.slice(0, idx + 1) : [target]

            // Get rules for target step
            const rules = TRUNCATE_RULES[target]

            // Delete steps data
            for (const step of rules.dropStepsData) {
                delete state.stepsData[step]
            }

            // Delete selections
            for (const key of rules.dropSelections) {
                delete state.selections[key]
            }
        },
        reset() {
            return createInitialState()
        }
    }
})

export const { goToStep, setStepData, setSelection, truncateToStep, reset } = wizard.actions
export default wizard.reducer