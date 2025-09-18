
import { Navigate, Route, Routes, BrowserRouter } from 'react-router-dom'
import ManagerPage from './Component/Manager/ManagerPage'



function App() {
  return (

    <BrowserRouter>

      <Routes>

        <Route path='/managerdashboard' element={<ManagerPage />} />
      </Routes>
    </BrowserRouter>

  )
}

export default App
