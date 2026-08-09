import type { RootState } from '@/store'
import Login from '@pages/Login'
import ResetPassword from '@/pages/ResetPassword'
import Dashboard from '@pages/dashboard'
import { useSelector } from 'react-redux'
import { Navigate, Route, Routes } from 'react-router-dom'
import Jobs from '@/pages/Jobs'
import Layout from "@/components/common/Layout";

const AppRoutes = () => {
  const {isAuthenticated} = useSelector((state: RootState) => state.auth);

  if (isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<Layout/>} >
        <Route index element={<Dashboard />}/>
        <Route path='/jobs' element={<Jobs/>} />
        <Route path='*' element={<Navigate to="/" replace/>}/>
        </Route>

      </Routes>
    );
  }

  return (
    <Routes>
      <Route path='/login' element={<Login />} />
      <Route path='/reset-password' element={<ResetPassword />} />
      <Route path='*' element={<Navigate to="/login" replace/>}/>

    </Routes>
  )
}

export default AppRoutes