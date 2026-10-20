import { Navigate, Route, Routes } from "react-router-dom"
import AppLayout from "./components/layout/AppLayout"
import Step1 from "./features/steps/Step1"
import Step2 from "./features/steps/Step2"
import Step3 from "./features/steps/Step3"
import Step4 from "./features/steps/Step4"
import Summary from "./features/summary/Summary"
import RefrigeratorData from "./features/charts/routes/RefrigeratorData"
import ProductManagement from "./features/products/ProductManagement"
import Inventory from "./features/inventory/Inventory"

export default function AppRoutes() {
    return (
        <Routes>
            <Route element={<AppLayout />}>
                <Route path="/" element={<Step1 />} />
                <Route path="/wizard/step2" element={<Step2 />} />
                <Route path="/wizard/step3" element={<Step3 />} />
                <Route path="/wizard/step4" element={<Step4 />} />
                <Route path="/wizard/summary" element={<Summary />} />
                <Route path="*" element={<Navigate to="/" replace />} />
                <Route path="/charts" element={<RefrigeratorData />} />
                <Route path="/products" element={<ProductManagement />} />
                <Route path="/inventory" element={<Inventory />} />
            </Route>
        </Routes>
    )
}