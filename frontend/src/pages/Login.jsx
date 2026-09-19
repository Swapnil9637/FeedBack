import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import AuthLayout from '../components/AuthLayout';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => {
    let { name, value } = e.target;
    if (name === 'email') value = value.toLowerCase();
    
    setForm({ ...form, [name]: value });
    
    if (name === 'email') {
      if (value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setErrors({ email: 'Invalid email address.' });
      } else {
        setErrors({ email: '' });
      }
    }
  };

  const isFormValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && form.password.trim() !== '';
  const isSubmitDisabled = loading || !isFormValid;

  const handleSubmit = async e => {
    e.preventDefault();
    if (isSubmitDisabled) return;

    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Login failed.');
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          Sign In
        </h2>
        <p className="text-gray-400 text-sm">Enter your credentials to access your account.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
        
        <div className="relative flex flex-col gap-1">
          <label htmlFor="email" className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">
            Email Address
          </label>
          <input
            name="email"
            id="email"
            type="email"
            placeholder="user@example.com"
            value={form.email}
            onChange={handleChange}
            required
            className={`w-full bg-transparent border-0 border-b-2 text-white px-1 pb-2 focus:ring-0 focus:outline-none transition-colors text-sm ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-white/20 focus:border-arcova-gold'}`}
          />
          <AnimatePresence>
            {errors.email && (
              <motion.span initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="absolute -bottom-5 left-1 text-[10px] text-red-500 font-bold tracking-wide">
                {errors.email}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        
        <div className="relative flex flex-col gap-1">
          <div className="flex justify-between items-end mb-1">
            <label htmlFor="password" className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">
              Password
            </label>
            <Link to="/forgot-password" className="text-[11px] text-arcova-gold hover:text-yellow-400 transition-colors font-medium relative top-1">
              Forgot password?
            </Link>
          </div>
          <input
            name="password"
            id="password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full bg-transparent border-0 border-b-2 border-white/20 text-white px-1 pb-2 focus:ring-0 focus:outline-none focus:border-arcova-gold transition-colors text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className={`w-full py-4 mt-4 rounded-full font-black uppercase tracking-widest transition-all duration-300 flex justify-center items-center text-xs ${
            isSubmitDisabled 
            ? 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/5' 
            : 'bg-white hover:bg-gray-200 text-[#0a0a0a] shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:-translate-y-0.5'
          }`}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div className="text-center mt-2 text-xs text-gray-500">
          Don't have an account? <Link to="/signup" className="text-white hover:text-arcova-gold transition-colors font-bold ml-1 border-b border-white/30 hover:border-arcova-gold pb-0.5">Sign up</Link>
        </div>

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-xs text-red-400 font-medium p-3 bg-red-400/10 rounded-lg border border-red-400/20"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </AuthLayout>
  );
};

export default Login;
