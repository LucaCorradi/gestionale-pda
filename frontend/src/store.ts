import { configureStore } from "@reduxjs/toolkit"
import wizard from './features/wizard/wizardSlice'

export const store = configureStore({
    reducer: { wizard }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch