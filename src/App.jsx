
import { Navigate, Route, Routes, BrowserRouter } from 'react-router-dom'
import ManagerPage from './Component/Manager/ManagerPage'
import Login from './Component/Auth/Login/Login'


function App() {
  return (

    <BrowserRouter>

      <Routes>

        <Route path='/managerdashboard' element={<ManagerPage />} />
        <Route path='/' element={<Login />} />
      </Routes>
    </BrowserRouter>

  )
}

export default App
