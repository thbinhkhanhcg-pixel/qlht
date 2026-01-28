
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import provider from '../core/provider';
import { UserRole } from '../core/types';
import { LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';

const { useNavigate } = ReactRouterDOM;

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register State
  const [regFullName, setRegFullName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('STUDENT');

  useEffect(() => {
    const checkSession = async () => {
      const user = await provider.getCurrentUser();
      if (user) {
        if (user.role === 'TEACHER' || user.role === 'ADMIN') navigate('/admin');
        else navigate('/app');
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu');
      return;
    }

    setError('');
    setLoading(true);
    try {
      // Đảm bảo gửi chuỗi đã trim()
      const user = await provider.login(username.trim(), password.trim());
      if (user) {
        if (user.role === 'TEACHER' || user.role === 'ADMIN') navigate('/admin');
        else navigate('/app');
      } else {
        setError('Tên đăng nhập hoặc mật khẩu không đúng');
      }
    } catch (err: any) {
      // Làm sạch thông báo lỗi từ GAS (loại bỏ chữ "Error:")
      const msg = err.message || '';
      setError(msg.replace('Error: ', '').replace('Exception: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim() || !regFullName.trim()) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      const newUser = await provider.register({
        username: username.trim(),
        password: password.trim(),
        fullName: regFullName.trim(),
        role: regRole
      });
      if (newUser.role === 'TEACHER' || newUser.role === 'ADMIN') navigate('/admin');
      else navigate('/app');
    } catch (err: any) {
      const msg = err.message || '';
      setError(msg.replace('Error: ', '').replace('Exception: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800 text-white px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-2">Quản Lý Lớp Chủ Nhiệm</h1>
        <p className="text-lg opacity-90">Cổng thông tin kết nối Nhà trường & Gia đình</p>
      </div>

      <div className="bg-white text-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button 
            disabled={loading}
            className={`flex-1 py-4 text-center font-semibold transition-colors ${!isRegistering ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-gray-50 text-gray-500'}`}
            onClick={() => { setIsRegistering(false); setError(''); }}
          >
            Đăng Nhập
          </button>
          <button 
            disabled={loading}
            className={`flex-1 py-4 text-center font-semibold transition-colors ${isRegistering ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-gray-50 text-gray-500'}`}
            onClick={() => { setIsRegistering(true); setError(''); }}
          >
            Đăng Ký
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded mb-6 text-sm border border-red-100 flex items-center">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isRegistering ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
                <input 
                  type="text" 
                  autoComplete="username"
                  disabled={loading}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="admin, hs1..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                <input 
                  type="password" 
                  autoComplete="current-password"
                  disabled={loading}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="••••••"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center disabled:bg-blue-400"
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : <LogIn size={20} className="mr-2" />} 
                {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
              </button>
              <div className="text-center text-xs text-gray-400 mt-6 space-y-1">
                <p>Mặc định: <strong>admin</strong> / 123 (Giáo viên)</p>
                <p>Học sinh: <strong>hs1</strong> / 123</p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                <input 
                  type="text" 
                  disabled={loading}
                  value={regFullName}
                  onChange={e => setRegFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
                <input 
                  type="text" 
                  disabled={loading}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                <input 
                  type="password" 
                  disabled={loading}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                 <div className="grid grid-cols-3 gap-2">
                   {(['TEACHER', 'PARENT', 'STUDENT'] as UserRole[]).map(role => (
                     <button 
                       key={role}
                       type="button"
                       disabled={loading}
                       className={`py-2 px-1 text-xs rounded border transition-all ${regRole === role ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                       onClick={() => setRegRole(role)}
                     >
                       {role === 'TEACHER' ? 'Giáo viên' : role === 'PARENT' ? 'Phụ huynh' : 'Học sinh'}
                     </button>
                   ))}
                 </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center justify-center mt-2 disabled:bg-green-400"
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : <UserPlus size={20} className="mr-2" />} 
                {loading ? 'Đang đăng ký...' : 'Đăng Ký Tài Khoản'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Landing;
